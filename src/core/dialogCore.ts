// src/core/dialogCore.ts
// Единое ядро логики STRATEG-RUSSIA - не зависит от UI
import pino from 'pino';
import { openDB, saveMessage, getMessages, markMessageDelivered, deleteOldMessages, MessageRecord, saveGroupMessage, saveGroupChat, getGroupChat, updateGroupChat, saveKeyPair, getKeyPair, saveContactKey, getContactKey } from './db';
import { initBroadcast, sendBroadcast, onBroadcast, closeBroadcast, BroadcastMessage } from './broadcast';
import { getOrCreateContact, updateContact } from './contact';
import { updateBadge } from '../utils/badge';
import { playNotificationSound, playSendSound, isNotificationsEnabled } from '../utils/sound';
import type { ReplyTo } from '../types/message';
// STAGE8: E2EE crypto imports
import { generateKeyPair, exportPublicKey, importPublicKey, deriveSharedSecret, encryptMessage, decryptMessage, importPrivateKey, exportSharedSecret, importSharedSecret } from './crypto';
// P2P transport imports
import { ITransport } from './transport';
import { P2PTransport, p2pManager, acceptOffer } from './p2p';
import { IdentityManager } from './identity';

const logger = pino({ name: 'strateg-russia-core' });

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // BUGFIX 1: up to 10MB
export const MAX_FILES = 3;
export const CHUNK_SIZE = 16 * 1024;
export const MAX_MESSAGE_SIZE = 10 * 1024;

const ALLOWED_FILE_TYPE_PREFIXES = ['image/', 'text/'] as const;
const ALLOWED_FILE_TYPES = new Set([
  'application/pdf',
  'application/json',
  'audio/webm',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/zip',
  'application/x-zip-compressed',
]);
const ALLOWED_FILE_EXTENSIONS = new Set(['.txt', '.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx', '.zip']);
const DELETED_MESSAGES_KEY = 'strateg_deleted_messages';

export interface FileAttachment {
  name: string;
  type: string;
  size: number;
  data: string; // base64
  meta?: {
    duration?: number;
  };
}

export function isAllowedFileType(mimeType: string): boolean {
  const type = mimeType || 'application/octet-stream';
  if (ALLOWED_FILE_TYPE_PREFIXES.some(prefix => type.startsWith(prefix))) {
    return true;
  }
  return ALLOWED_FILE_TYPES.has(type);
}

// BUGFIX 1: validate by MIME or file extension (.doc/.docx/.zip often have empty MIME)
export function isAllowedFile(file: File): boolean {
  if (isAllowedFileType(file.type)) return true;
  const dot = file.name.lastIndexOf('.');
  if (dot === -1) return false;
  return ALLOWED_FILE_EXTENSIONS.has(file.name.slice(dot).toLowerCase());
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      if (!result) {
        reject(new Error('FileReader returned null'));
        return;
      }
      const base64 = result.split(',')[1];
      if (!base64) {
        reject(new Error('Invalid data URL format'));
        return;
      }
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function chunkString(str: string, size: number): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < str.length; i += size) {
    chunks.push(str.slice(i, i + size));
  }
  return chunks;
}

interface ParsedWirePayload {
  text: string;
  files?: FileAttachment[];
  replyTo?: ReplyTo;
}

// HOTFIX: normalize single-file and legacy wire formats into FileAttachment[]
function extractFilesFromPayload(parsed: Record<string, unknown>): FileAttachment[] | undefined {
  if (Array.isArray(parsed.files) && parsed.files.length > 0) {
    return parsed.files as FileAttachment[];
  }

  if (parsed.type === 'file' || parsed.hasAttachment || parsed.fileName) {
    const data = typeof parsed.data === 'string' ? parsed.data : '';
    if (!data) {
      return undefined;
    }

    const name = String(parsed.fileName || parsed.name || 'file');
    const mimeType =
      typeof parsed.mimeType === 'string'
        ? parsed.mimeType
        : parsed.type === 'file'
          ? 'application/octet-stream'
          : typeof parsed.type === 'string' && parsed.type.includes('/')
            ? parsed.type
            : 'application/octet-stream';
    const size = typeof parsed.size === 'number' ? parsed.size : data.length;

    return [{ name, type: mimeType, size, data }];
  }

  return undefined;
}

function isStructuredPayload(parsed: Record<string, unknown>): boolean {
  return Boolean(
    parsed.id ||
    parsed.text !== undefined ||
    parsed.files ||
    parsed.replyTo ||
    parsed.type === 'file' ||
    parsed.type === 'MESSAGE' ||
    parsed.hasAttachment ||
    parsed.fileName
  );
}

function buildParsedWirePayload(parsed: Record<string, unknown>): ParsedWirePayload {
  const files = extractFilesFromPayload(parsed);
  const text = typeof parsed.text === 'string' ? parsed.text : '';

  return {
    // HOTFIX: never surface raw file bytes as message text
    text: files?.length ? text : text,
    files,
    replyTo: parsed.replyTo as ReplyTo | undefined,
  };
}

function encodeBase64(value: string): string {
  if (typeof globalThis.btoa === 'function') {
    const bytes = new TextEncoder().encode(value);
    let binary = '';
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    return globalThis.btoa(binary);
  }

  return Buffer.from(value, 'utf8').toString('base64');
}

function decodeBase64(value: string): string {
  // HOTFIX: strip non-base64 chars before atob (file chunks may carry whitespace/unicode)
  const normalized = value.replace(/[^A-Za-z0-9+/=]/g, '');
  if (typeof globalThis.atob === 'function') {
    const binary = globalThis.atob(normalized);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  }

  return Buffer.from(normalized, 'base64').toString('utf8');
}

function parseWirePayload(payload: string): ParsedWirePayload {
  try {
    const parsed = JSON.parse(payload) as Record<string, unknown>;
    if (parsed && typeof parsed === 'object' && isStructuredPayload(parsed)) {
      return buildParsedWirePayload(parsed);
    }
  } catch {
    // not a JSON payload, try base64 decode below
  }

  const decoded = decodeBase64(payload);
  try {
    const parsed = JSON.parse(decoded) as Record<string, unknown>;
    if (parsed && typeof parsed === 'object' && isStructuredPayload(parsed)) {
      return buildParsedWirePayload(parsed);
    }
  } catch {
    // plain text payload
  }

  // HOTFIX: decoded binary/JSON without structure — don't render as visible text
  if (/^[\x00-\x08\x0E-\x1F]/.test(decoded) || (decoded.startsWith('{') && decoded.includes('"files"'))) {
    return { text: '' };
  }

  return { text: decoded };
}

export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read';

export interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: number;
  from?: string;
  files?: FileAttachment[];
  isDeleted?: boolean; // BUGFIX 5: locally hidden incoming messages
  status: MessageStatus;
  readAt?: number;
  replyTo?: ReplyTo;
  isEncrypted?: boolean; // STAGE8: E2EE indicator
  context?: {
    type: 'deal' | 'barter' | 'project';
    id: string;
    title: string;
  };
}

export type { MessageRecord } from './db';

export interface ConnectionState {
  isConnected: boolean;
  connectionStatus: string;
  currentStrategId: string | null;
  hasPeer: boolean; // есть ли второй клиент для общения
}

export interface DialogCore {
  // Состояние
  getConnectionState(): ConnectionState;
  getMessages(context?: Message['context']): Message[];

  // Действия
  connect(): Promise<void>;
  disconnect(): void;
  sendMessage(to: string, text: string, files?: File[], replyTo?: ReplyTo, context?: Message['context']): Promise<void>;
  loadHistory(chatId: string): Promise<MessageRecord[]>;
  switchChat(chatId: string): void;
  deleteMessage(messageId: string): Promise<void>;
  clearChat(chatId: string): Promise<void>;

  // Подписки на изменения
  onConnectionChange(callback: (state: ConnectionState) => void): () => void;
  onMessagesChange(callback: (messages: Message[]) => void): () => void;
  onMessageReceived(callback: (message: Message) => void): () => void;
  onChatSwitch(callback: (chatId: string) => void): () => void;
  onError(callback: (error: string) => void): () => void;
  onGroupMessageReceived(callback: (message: {
    id: string;
    roomId: string;
    senderId: string;
    text?: string;
    files?: FileAttachment[];
    timestamp: number;
  }) => void): () => void;
  onGroupUpdate(callback: (update: {
    roomId: string;
    action: 'create' | 'join' | 'leave';
    userId?: string;
  }) => void): () => void;
  sendRawData?(data: any): void;
}

// Реализация ядра
export class StrategDialogCore implements DialogCore {
  private transport: ITransport | null = null;
  private identity: IdentityManager;
  private connectionState: ConnectionState = {
    isConnected: false,
    connectionStatus: 'disconnected',
    currentStrategId: null,
    hasPeer: false
  };
  private messages: Message[] = [];
  private currentChatId: string | null = null;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private pongTimeout: ReturnType<typeof setTimeout> | null = null;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;
  private missedPings = 0;
  private lastPong = Date.now();
  private receivedMessageIds = new Set<string>(); // Дедупликация
  // BUGFIX 5: IDs of incoming messages hidden locally
  private deletedMessageIds = new Set<string>();
  // STAGE8: E2EE key storage
  private myPrivateKey: CryptoKey | null = null;
  private myPublicKey: string | null = null;
  
  // Константы
  private readonly PING_INTERVAL = 20000; // 20 секунд
  private readonly PONG_TIMEOUT = 35000; // 35 секунд
  private readonly MAX_MISSED_PINGS = 3;
  // Incoming chunk assembly (simpler array-based collector)
  private incomingChunks: Map<string, { chunks: string[]; total: number; from: string; timestamp: number }> = new Map();
  // Pending send queue: messageId -> { record, attempts, timeout }
  private pendingMessages: Map<string, { record: MessageRecord; attempts: number; timeout: ReturnType<typeof setTimeout> | null; to: string }> = new Map();
  private readonly ACK_TIMEOUT = 10000; // 10 seconds
  private readonly MAX_RETRIES = 3;
  private readonly CLEANUP_INTERVAL_DAYS = 30; // 30 дней

  private getUnreadCounts(): Record<string, number> {
    if (typeof window === 'undefined') {
      return {};
    }

    try {
      const raw = window.localStorage.getItem('strateg_unread_counts');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  private saveUnreadCounts(counts: Record<string, number>): void {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem('strateg_unread_counts', JSON.stringify(counts));
    const total = Object.values(counts).reduce((sum, value) => sum + (Number(value) || 0), 0);
    updateBadge(total);
  }

  private persistMessageState(message: Message): void {
    if (typeof window === 'undefined') {
      return;
    }

    const payload = {
      id: message.id,
      text: message.text,
      timestamp: message.timestamp,
      isUser: message.isUser,
      from: message.from,
      files: message.files,
      isDeleted: message.isDeleted,
      status: message.status,
      readAt: message.readAt,
      replyTo: message.replyTo,
    };

    window.localStorage.setItem(`strateg_messages_${message.id}`, JSON.stringify(payload));
  }

  private restoreMessageState(message: Message): Message {
    if (typeof window === 'undefined') {
      return message;
    }

    try {
      const raw = window.localStorage.getItem(`strateg_messages_${message.id}`);
      if (!raw) {
        return message;
      }

      const stored = JSON.parse(raw) as Partial<Message> & { status?: MessageStatus; readAt?: number };
      if (stored.status) {
        message.status = stored.status;
      }
      if (typeof stored.readAt === 'number') {
        message.readAt = stored.readAt;
      }
      if (stored.replyTo) {
        message.replyTo = stored.replyTo;
      }
      if (Array.isArray(stored.files) && stored.files.length > 0) {
        message.files = stored.files;
      }
    } catch {
      // ignore malformed cached state
    }

    return message;
  }

  private updateMessageStatus(messageId: string, status: MessageStatus, readAt?: number): Message | null {
    const message = this.messages.find((item) => item.id === messageId);
    if (!message) {
      return null;
    }

    message.status = status;
    if (status === 'read' && typeof readAt === 'number') {
      message.readAt = readAt;
    } else if (status !== 'read') {
      delete message.readAt;
    }

    this.persistMessageState(message);
    this.notifyMessagesChange();
    return message;
  }

  private incrementUnreadCount(chatId: string): void {
    const normalized = chatId.trim().toUpperCase();
    if (!normalized) {
      return;
    }

    const counts = this.getUnreadCounts();
    counts[normalized] = (counts[normalized] || 0) + 1;
    this.saveUnreadCounts(counts);
  }

  private resetUnreadCount(chatId: string): void {
    const normalized = chatId.trim().toUpperCase();
    if (!normalized) {
      return;
    }

    const counts = this.getUnreadCounts();
    counts[normalized] = 0;
    this.saveUnreadCounts(counts);
  }

  private showBrowserNotification(from: string, text: string): void {
    if (typeof window === 'undefined' || typeof Notification === 'undefined') {
      return;
    }

    if (Notification.permission !== 'granted') {
      return;
    }

    new Notification(`СТРАТЕГ: ${from}`, {
      body: text,
      icon: '/icon-192.png',
      badge: '/badge-72.png',
    });
  }

  private vibrateForMobile(): void {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return;
    }

    const isMobile = /android|iphone|ipad|mobile/i.test(navigator.userAgent) || window.innerWidth < 768;
    if (document.hidden && isMobile && 'vibrate' in navigator) {
      navigator.vibrate([100, 50, 100]);
    }
  }

  // Callbacks
  private connectionCallbacks: ((state: ConnectionState) => void)[] = [];
  private messagesCallbacks: ((messages: Message[]) => void)[] = [];
  private messageCallbacks: ((message: Message) => void)[] = [];
  private chatSwitchCallbacks: ((chatId: string) => void)[] = [];
  private errorCallbacks: ((error: string) => void)[] = [];
  private groupMessageCallbacks: ((message: {
    id: string;
    roomId: string;
    senderId: string;
    text?: string;
    files?: FileAttachment[];
    timestamp: number;
  }) => void)[] = [];
  private groupUpdateCallbacks: ((update: {
    roomId: string;
    action: 'create' | 'join' | 'leave';
    userId?: string;
  }) => void)[] = [];
  // QR / P2P signal callbacks
  private qrSignalCallbacks: ((sdp: string) => void)[] = [];

  constructor() {
    this.identity = new IdentityManager();
    // Загружаем или генерируем STRATEG-ID при создании
    if (typeof window !== 'undefined') {
      const savedId = localStorage.getItem('strateg-id');
      if (savedId && /^STRATEG-[A-Z0-9]{9}$/.test(savedId)) {
        this.connectionState.currentStrategId = savedId;
      } else {
        // use identity-managed user id when available
        try {
          this.connectionState.currentStrategId = this.identity.getUserId();
        } catch {
          this.connectionState.currentStrategId = this.generateStrategId();
        }
        localStorage.setItem('strateg-id', this.connectionState.currentStrategId);
      }
      
      // Инициализация IndexedDB
      openDB().catch(err => console.error('Failed to open IndexedDB:', err));
      void this.seedContactsFromHistory();
      
      // Инициализация BroadcastChannel
      initBroadcast();
      
      const savedChat = localStorage.getItem('strateg-last-chat');
      if (savedChat && /^STRATEG-[A-Z0-9]{9}$/.test(savedChat)) {
        this.currentChatId = savedChat;
      }
      
      // Подписка на broadcast
      this.setupBroadcastListener();

      // BUGFIX 5: restore locally deleted message IDs
      const savedDeleted = localStorage.getItem(DELETED_MESSAGES_KEY);
      if (savedDeleted) {
        try {
          (JSON.parse(savedDeleted) as string[]).forEach((id) => this.deletedMessageIds.add(id));
        } catch {
          // ignore corrupt storage
        }
      }
      
      // Запуск cleanup (сразу + раз в день)
      this.runCleanup();
      this.startCleanup();
      
      // Регистрация Service Worker
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
          .then(reg => console.log('📦 SW registered:', reg.scope))
          .catch(err => console.log('❌ SW registration failed:', err));
      }

      // Auto-add contact when P2P manager reports an open transport
      p2pManager.onOpen(async (peerId) => {
        try {
          await getOrCreateContact(peerId, { id: peerId, name: peerId });
          updateBadge();
          this.qrSignalCallbacks.forEach(cb => cb(`connected:${peerId}`));
        } catch (e) {
          logger.warn('Failed to add contact on p2p open', e);
        }
      });
    }
  }

  getConnectionState(): ConnectionState {
    return { ...this.connectionState };
  }

  getMessages(context?: Message['context']): Message[] {
    if (!context) {
      return [...this.messages];
    }
    return this.messages.filter(msg => 
      msg.context?.type === context.type && msg.context?.id === context.id
    );
  }

  async connect(): Promise<void> {
    if (this.transport?.isConnected()) return;

    // Очистка интервалов при переподключении
    this.clearIntervals();
    this.missedPings = 0;
    this.lastPong = Date.now();
    
    // Инициализация IndexedDB если ещё не открыта
    if (typeof window !== 'undefined') {
      openDB().catch(err => console.error('Failed to open IndexedDB:', err));
    }

    this.updateConnectionState({
      ...this.connectionState,
      connectionStatus: 'connecting'
    });

    try {
      // Создаём P2P транспорт
      this.transport = new P2PTransport(this.identity.getDeviceId());

      // relay QR signals from transport to UI listeners
      (this.transport as any).onQRGenerated((sdp: string) => {
        this.qrSignalCallbacks.forEach(cb => cb(sdp));
      });

      // Настраиваем callbacks
      this.transport!.onMessage(async (data) => {
        try {
          // CHUNK handling (assemble on client)
          if (data.type === 'CHUNK') {
            const messageId = data.messageId;
            const existing = this.incomingChunks.get(messageId) || { chunks: [], total: data.totalChunks, from: data.senderId, timestamp: Date.now() };
            existing.chunks[data.chunkIndex] = data.data;
            existing.total = data.totalChunks;
            this.incomingChunks.set(messageId, existing);
            return;
          }

          if (data.type === 'CHUNK_COMPLETE') {
            const messageId = data.messageId;
            const assembled = this.incomingChunks.get(messageId);
            if (!assembled) return;
            // Check if all chunks present
            const chunksArr: string[] = [];
            for (let i = 0; i < assembled.total; i++) {
              const c = assembled.chunks[i];
              if (typeof c === 'undefined') {
                // missing chunk; drop
                this.incomingChunks.delete(messageId);
                return;
              }
              chunksArr.push(c);
            }
            this.incomingChunks.delete(messageId);
            try {
              const encoded = chunksArr.join('');
              const json = decodeBase64(encoded);
              const msgObj = JSON.parse(json) as {
                id?: string;
                text?: string;
                files?: FileAttachment[];
                timestamp?: number;
                senderId?: string;
                from?: string;
                replyTo?: ReplyTo;
              };
              if (msgObj?.id) {
                this.handleIncomingMessage({
                  id: msgObj.id,
                  from: msgObj.senderId || msgObj.from || '',
                  text: msgObj.text || '',
                  files: msgObj.files,
                  timestamp: msgObj.timestamp || Date.now(),
                  replyTo: msgObj.replyTo,
                });
              }
            } catch (err) {
              console.error('Failed to assemble chunked message', err);
            }
            return;
          }

          if (data.type === 'PING') {
            this.transport?.send(JSON.stringify({ type: 'PONG', timestamp: data.timestamp }));
            return;
          } else if (data.type === 'REGISTERED') {
            console.log(`🧊 Registered as ${data.strategId}`);
            this.updateConnectionState({
              ...this.connectionState,
              currentStrategId: data.strategId
            });
          } else if (data.type === 'MESSAGE' || data.type === 'file') {
            const parsed = parseWirePayload(data.payload);
            // HOTFIX: file messages render as attachments, not garbled text
            const incomingText = parsed.files?.length ? (parsed.text?.trim() ? parsed.text : '') : parsed.text;
            this.handleIncomingMessage({
              id: data.id,
              from: data.from || data.senderId || '',
              text: incomingText,
              files: parsed.files,
              timestamp: data.timestamp,
              replyTo: parsed.replyTo,
            });
          } else if (data.type === 'encrypted_message') {
            // STAGE8: Handle incoming encrypted message
            this.handleEncryptedMessage(data);
          } else if (data.type === 'GROUP_MESSAGE') {
            this.handleGroupMessage(data);
          } else if (data.type === 'GROUP_CREATE') {
            this.handleGroupCreate(data);
          } else if (data.type === 'GROUP_JOIN') {
            this.handleGroupJoin(data);
          } else if (data.type === 'GROUP_LEAVE') {
            this.handleGroupLeave(data);
          } else if (data.type === 'SENT' || data.type === 'ACK') {
            const messageId = data.messageId || data.id;
            if (messageId) {
              console.log(`✅ Message acked: ${messageId}`);
              const pending = this.pendingMessages.get(messageId);
              if (pending) {
                if (pending.timeout) clearTimeout(pending.timeout);
                this.pendingMessages.delete(messageId);
              }
              this.updateMessageStatus(messageId, 'delivered');
              markMessageDelivered(messageId).catch(err => logger.error({ err }, 'Failed to mark delivered'));
            }
          } else if (data.type === 'read_receipt') {
            const rawMessageIds = (data as { messageIds?: unknown[] }).messageIds;
            const messageIds = Array.isArray(rawMessageIds)
              ? rawMessageIds.filter((messageId: unknown): messageId is string => typeof messageId === 'string')
              : [];
            if (messageIds.length) {
              const readAt = typeof data.timestamp === 'number' ? data.timestamp : Date.now();
              messageIds.forEach((messageId: string) => this.updateMessageStatus(messageId, 'read', readAt));
            }
          } else if (data.type === 'PONG') {
            this.lastPong = Date.now();
            this.missedPings = 0;
            console.log('🏓 PONG received');
          } else if (data.type === 'DATA_SYNC') {
            try {
              // динамический импорт, чтобы избежать циклической зависимости
              const mod = await import('./dataStore');
              const ds = mod.dataStore || mod.default;
              const payload = (data as any).payload ?? (data as any).data ?? data;
              if (ds && typeof ds.importData === 'function') {
                ds.importData(payload);
                // если при импорте установлен флаг конфликта, сообщаем UI
                if (typeof ds.getSyncStatus === 'function' && ds.getSyncStatus() === 'conflict') {
                  this.notifyError('Конфликт данных при синхронизации');
                } else {
                  sendBroadcast('DATA_SYNC_APPLIED', { timestamp: Date.now() });
                }
              }
            } catch (err) {
              console.error('Failed to apply DATA_SYNC', err);
              this.notifyError('Не удалось применить синхронизацию данных');
            }
            return;
          } else if (data.type === 'ERROR') {
            console.error('STRATEG transport error:', data.error);
            this.notifyError(data.error || 'Unknown error');
          } else if (data.type === 'public_key_response') {
            // STAGE8: Handle public key response from coordinator
            this.handlePublicKeyResponse(data);
          } else if (data.type === 'request_key') {
            // STAGE8: Handle request for our public key (send via coordinator)
            if (this.myPublicKey) {
              this.transport?.send(JSON.stringify({
                type: 'public_key_response',
                targetId: data.requesterId,
                publicKey: this.myPublicKey
              }));
            }
          }
        } catch (error) {
          console.error('Error parsing transport message:', error);
        }
      });

      // Binary handler (if transport supports it)
      try {
        const anyT = this.transport as any;
        if (anyT.onBinary && typeof anyT.onBinary === 'function') {
          anyT.onBinary((payload: { fileId: string; data: ArrayBuffer; meta?: any }) => {
            try {
              this.handleIncomingBinary(payload);
            } catch (err) {
              console.error('Error handling incoming binary', err);
            }
          });
        }
      } catch (err) {
        // ignore if transport doesn't support binary
      }

      this.transport!.onConnect(async () => {
        console.log('🧊 STRATEG P2P connected');

        // Генерируем ID только если его нет
        if (!this.connectionState.currentStrategId) {
          this.connectionState.currentStrategId = this.generateStrategId();
          if (typeof window !== 'undefined') {
            localStorage.setItem('strateg-id', this.connectionState.currentStrategId);
          }
        }

        this.updateConnectionState({
          isConnected: true,
          connectionStatus: 'connected',
          currentStrategId: this.connectionState.currentStrategId,
          hasPeer: this.connectionState.hasPeer
        });

        // STAGE8: Initialize E2EE key pair
        this.initializeKeyPair().catch(err => {
          console.error('Failed to initialize key pair:', err);
        });

        // Регистрируемся
        this.register(this.connectionState.currentStrategId!);

        // Запуск PING interval
        this.startPingInterval();

        // Загрузка истории для текущего чата
        if (this.currentChatId) {
          this.loadHistory(this.currentChatId).catch(err =>
            logger.error({ err }, 'Failed to load history on connect')
          );
        }

        // Request push subscription if not already subscribed
        this.requestPushSubscription();

          // При подключении — отправляем все pending сообщения
          try {
            const dbMod = await import('./db');
            if (typeof dbMod.getPendingMessages === 'function') {
              const pendings = await dbMod.getPendingMessages();
              pendings.forEach((rec) => {
                this.enqueuePendingRecord(rec, (rec.to || rec.chatId || '').toUpperCase());
              });
            }
          } catch (err) {
            console.warn('Failed to load pending messages', err);
          }
      });

      this.transport!.onDisconnect(() => {
        console.log('🧊 STRATEG P2P disconnected');
        this.clearIntervals();
        this.updateConnectionState({
          ...this.connectionState,
          isConnected: false,
          connectionStatus: 'disconnected'
        });

        // Автопереподключение
        this.reconnectTimeout = setTimeout(() => {
          this.connect();
        }, 3000);
      });

      await this.transport!.connect();

    } catch (error) {
      console.error('Failed to connect to STRATEG P2P:', error);
      this.updateConnectionState({
        ...this.connectionState,
        connectionStatus: 'error'
      });
    }
  }

  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.clearIntervals();

    if (this.transport) {
      this.transport.disconnect();
      this.transport = null;
    }

    // Закрытие BroadcastChannel
    if (typeof window !== 'undefined') {
      closeBroadcast();
    }

    this.updateConnectionState({
      isConnected: false,
      connectionStatus: 'disconnected',
      currentStrategId: null,
      hasPeer: false
    });
  }

  // Send raw data over transport (used by DataStore sync)
  sendRawData(data: any): void {
    if (this.transport && this.transport.isConnected()) {
      try {
        this.transport.send(JSON.stringify(data));
      } catch (err) {
        console.error('Failed to send raw data via transport', err);
      }
    } else {
      console.warn('Transport not connected - cannot send raw data');
      this.notifyError('Transport not connected');
    }
  }

  async sendMessage(to: string, text: string, files?: File[], replyTo?: ReplyTo, context?: Message['context']): Promise<void> {
    if (!this.transport || !this.transport.isConnected()) {
      console.error('Transport not connected');
      this.notifyError('Не удалось отправить: нет соединения');
      return;
    }

    if (!this.connectionState.currentStrategId) {
      console.error('Not registered with STRATEG-ID');
      this.notifyError('Не удалось отправить: не зарегистрирован');
      return;
    }
    // Validate files if provided
    const attachments: FileAttachment[] = [];
    if (files && files.length > 0) {
      if (files.length > MAX_FILES) {
        this.notifyError(`Слишком много файлов (макс. ${MAX_FILES})`);
        return;
      }

      for (const f of files) {
        if (f.size > MAX_FILE_SIZE) {
          this.notifyError(`Файл ${f.name} слишком большой (макс. 10MB)`);
          return;
        }
        if (!isAllowedFile(f)) {
          this.notifyError(`Недопустимый тип файла: ${f.name}`);
          return;
        }
        try {
          const mimeType = f.type || 'application/octet-stream';
          const base64 = await fileToBase64(f);
          attachments.push({ name: f.name, type: mimeType, size: f.size, data: base64 });
        } catch (err) {
          logger.error({ err }, 'Failed to read file');
          this.notifyError('Не удалось прочитать файл');
          return;
        }
      }
    }

    if (attachments.length === 0 && !text.trim()) {
      return;
    }

    // Validate plain text size before adding message (preserve previous behaviour)
    if (attachments.length === 0) {
      const encodedText = encodeBase64(text);
      if (encodedText.length > MAX_MESSAGE_SIZE) {
        console.error('Message too large');
        this.notifyError('Сообщение слишком длинное (макс. 10KB)');
        return;
      }
    }

    // Добавляем сообщение в локальный список
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const userMessage: Message = {
      id: messageId,
      text,
      isUser: true,
      timestamp: Date.now(),
      from: this.connectionState.currentStrategId,
      files: attachments.length ? attachments : undefined,
      status: 'pending',
      replyTo,
      context,
    };

    this.messages.push(userMessage);
    this.persistMessageState(userMessage);
    this.sortMessages();
    this.notifyMessagesChange();
    playSendSound();

    // Сохранение в IndexedDB (note: files are not persisted in DB currently)
    const record: MessageRecord = {
      id: messageId,
      chatId: to.toUpperCase(),
      text,
      from: this.connectionState.currentStrategId!,
      to: to.toUpperCase(),
      timestamp: Date.now(),
      isUser: true,
      delivered: false,
      status: 'pending',
      replyTo,
    };
    saveMessage(record).catch(err => logger.error({ err }, 'Failed to save message'));
    void getOrCreateContact(to.toUpperCase()).then((contact) => {
      void updateContact(contact.id, {
        lastMessage: text || (attachments.length ? '[Файл]' : ''),
        lastMessageAt: Date.now(),
      });
    });

    // STAGE8: E2EE encryption for personal messages (not groups)
    const isGroupMessage = to.toUpperCase().startsWith('ROOM-');

    if (isGroupMessage || attachments.length > 0 || replyTo) {
      // Groups, files, and replies: send plain text (no encryption)
      if (attachments.length === 0 && !replyTo) {
        const encodedText = encodeBase64(text);
        this.transport.send(JSON.stringify({ type: 'SEND', to: to.toUpperCase(), payload: encodedText }));
        this.enqueuePendingRecord(record, to);
      } else {
        // Prepare message payload including files
        const payloadObj = {
          type: 'MESSAGE',
          id: messageId,
          chatId: to.toUpperCase(),
          senderId: this.connectionState.currentStrategId,
          text: text || undefined,
          files: attachments.length ? attachments : undefined,
          timestamp: Date.now(),
          replyTo,
        };

        const json = JSON.stringify(payloadObj);
        const payload = replyTo ? json : encodeBase64(json);

        if (!replyTo && payload.length > MAX_MESSAGE_SIZE) {
          this.sendChunkedMessage(payloadObj);
          this.enqueuePendingRecord(record, to);
        } else {
          this.transport.send(JSON.stringify({ type: 'SEND', to: to.toUpperCase(), payload }));
          this.enqueuePendingRecord(record, to);
        }
      }
    } else {
      // Personal message without files/reply: try E2EE encryption
      const targetId = to.toUpperCase();
      const sharedSecret = await this.getSharedSecret(targetId);

      if (!sharedSecret) {
        // No shared secret: send plain text + request public key
        console.log(`🔐 No shared secret for ${targetId}, sending plain text`);
        this.requestPublicKey(targetId);
        this.notifyError('⚠️ Сообщение отправлено без шифрования — ключ контакта не получен');

        const encodedText = encodeBase64(text);
        this.transport.send(JSON.stringify({ type: 'SEND', to: targetId, payload: encodedText }));
        this.enqueuePendingRecord(record, targetId);
      } else {
        // Encrypt message
        try {
          const { ciphertext, iv } = await encryptMessage(text, sharedSecret);
          this.transport.send(JSON.stringify({
            type: 'encrypted_message',
            to: targetId,
            ciphertext,
            iv,
            senderPublicKey: this.myPublicKey,
            messageId,
            timestamp: Date.now()
          }));
          this.enqueuePendingRecord(record, targetId);
          console.log(`🔐 Sent encrypted message to ${targetId}`);
        } catch (error) {
          console.error('Encryption failed, sending plain text:', error);
          this.notifyError('⚠️ Ошибка шифрования, отправлено открытым текстом');
          const encodedText = encodeBase64(text);
          this.transport.send(JSON.stringify({ type: 'SEND', to: targetId, payload: encodedText }));
          this.enqueuePendingRecord(record, targetId);
        }
      }
    }

    // Broadcast для синхронизации табов
    sendBroadcast('NEW_MESSAGE', { message: userMessage, chatId: to.toUpperCase() });
  }

  async sendFile(to: string, arrayBuffer: ArrayBuffer, name: string, mime: string): Promise<void> {
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
    const record: MessageRecord = {
      id: messageId,
      chatId: to.toUpperCase(),
      text: `[Файл] ${name}`,
      from: this.connectionState.currentStrategId!,
      to: to.toUpperCase(),
      timestamp: Date.now(),
      isUser: true,
      delivered: false,
      status: 'pending',
    };

    // Persist message record
    saveMessage(record).catch(err => logger.error({ err }, 'Failed to save file message'));

    // Send binary via transport if possible
    try {
      const anyT = this.transport as any;
      if (anyT && typeof anyT.sendBinary === 'function') {
        anyT.sendBinary(arrayBuffer, { messageId, fileId, name, mime, timestamp: Date.now(), from: this.connectionState.currentStrategId });
      } else if (this.transport && this.transport.isConnected()) {
        // Fallback: send base64 in chunks
        const b64 = encodeBase64(String.fromCharCode.apply(null, Array.from(new Uint8Array(arrayBuffer))));
        this.sendChunkedMessage({ id: messageId, chatId: to.toUpperCase(), senderId: this.connectionState.currentStrategId || undefined, text: undefined, files: [{ name, type: mime, size: arrayBuffer.byteLength, data: b64 }], timestamp: Date.now() });
      } else {
        // Not connected yet: enqueue for later
        this.enqueuePendingRecord(record, to);
        return;
      }

      // Enqueue for ack/retry handling
      this.enqueuePendingRecord(record, to);
    } catch (err) {
      logger.error({ err }, 'Failed to send file');
      this.notifyError('Не удалось отправить файл');
    }
  }

  private handleIncomingMessage(data: {
    id: string;
    from: string;
    text: string;
    files?: FileAttachment[];
    timestamp: number;
    replyTo?: ReplyTo;
  }): void {
    if (this.receivedMessageIds.has(data.id)) {
      console.log('Duplicate message ignored:', data.id);
      return;
    }
    this.receivedMessageIds.add(data.id);

    const newMessage: Message = this.applyDeletedFlag({
      id: data.id,
      text: data.text,
      isUser: false,
      timestamp: data.timestamp,
      from: data.from,
      files: data.files,
      status: 'delivered',
      replyTo: data.replyTo,
    });

    this.messages.push(newMessage);
    this.persistMessageState(newMessage);
    this.sortMessages();
    this.notifyMessagesChange();
    this.notifyMessageReceived(newMessage);

    if (typeof document !== 'undefined' && document.hidden) {
      playNotificationSound();
    }

    if (isNotificationsEnabled()) {
      this.incrementUnreadCount(data.from);
      if (typeof document !== 'undefined' && document.hidden) {
        this.showBrowserNotification(data.from, data.text);
      }
      this.vibrateForMobile();
    }

    if (typeof document !== 'undefined' && document.hidden) {
      this.sendPushNotification(data.from, data.text);
    }

    const record: MessageRecord = {
      id: data.id,
      chatId: data.from,
      text: newMessage.text,
      from: data.from,
      to: this.connectionState.currentStrategId!,
      timestamp: data.timestamp,
      isUser: false,
      delivered: true,
      replyTo: data.replyTo,
    };
    saveMessage(record).catch(err => logger.error({ err }, 'Failed to save message'));
    void getOrCreateContact(data.from.toUpperCase()).then((contact) => {
      void updateContact(contact.id, {
        lastMessage: newMessage.text || (newMessage.files?.length ? '[Файл]' : ''),
        lastMessageAt: data.timestamp,
      });
    });
    this.sendAck(data.id);
    sendBroadcast('NEW_MESSAGE', { message: newMessage, chatId: data.from });
  }

  private handleIncomingBinary(payload: { fileId: string; data: ArrayBuffer; meta?: any }): void {
    const meta = payload.meta || {};
    const messageId = meta.messageId || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const from = meta.from || meta.senderId || 'unknown';
    const name = meta.name || 'file';
    const mime = meta.mime || 'application/octet-stream';
    const timestamp = meta.timestamp || Date.now();

    // Convert ArrayBuffer to base64 for storage/display
    const uint8 = new Uint8Array(payload.data);
    let binary = '';
    for (let i = 0; i < uint8.length; i++) binary += String.fromCharCode(uint8[i]);
    const b64 = typeof globalThis.btoa === 'function' ? globalThis.btoa(binary) : Buffer.from(binary, 'binary').toString('base64');

    const newMessage: Message = this.applyDeletedFlag({
      id: messageId,
      text: '',
      isUser: false,
      timestamp,
      from,
      files: [{ name, type: mime, size: uint8.length, data: b64 }],
      status: 'delivered'
    });

    this.messages.push(newMessage);
    this.persistMessageState(newMessage);
    this.sortMessages();
    this.notifyMessagesChange();
    this.notifyMessageReceived(newMessage);

    const record: MessageRecord = {
      id: messageId,
      chatId: from,
      text: newMessage.text,
      from,
      to: this.connectionState.currentStrategId!,
      timestamp,
      isUser: false,
      delivered: true,
      replyTo: undefined,
    };
    saveMessage(record).catch(err => logger.error({ err }, 'Failed to save binary message'));
    void getOrCreateContact(from.toUpperCase()).then((contact) => {
      void updateContact(contact.id, {
        lastMessage: '[Файл]',
        lastMessageAt: timestamp,
      });
    });

    // send ack for the message
    if (meta.messageId) this.sendAck(meta.messageId);
    sendBroadcast('NEW_MESSAGE', { message: newMessage, chatId: from });
  }

  private sendChunkedMessage(messageObj: {
    id: string;
    chatId: string;
    senderId?: string;
    text?: string;
    files?: FileAttachment[];
    timestamp: number;
    type?: string;
  }): void {
    if (!this.transport || !this.transport.isConnected()) return;
    const json = JSON.stringify(messageObj);
    // HOTFIX: chunk base64 payload (receiver decodes with decodeBase64, not raw JSON)
    const encoded = encodeBase64(json);
    const chunks = chunkString(encoded, CHUNK_SIZE);
    const messageId = messageObj.id;

    for (let i = 0; i < chunks.length; i++) {
      const chunkMsg = {
        type: 'CHUNK',
        messageId,
        chunkIndex: i,
        totalChunks: chunks.length,
        data: chunks[i],
        chatId: messageObj.chatId,
        senderId: messageObj.senderId,
        timestamp: Date.now()
      };
      try {
        this.transport.send(JSON.stringify(chunkMsg));
      } catch (err) {
        logger.error({ err }, 'Failed to send chunk');
      }
    }

    // send completion marker
    try {
      this.transport.send(JSON.stringify({ type: 'CHUNK_COMPLETE', messageId, chatId: messageObj.chatId, senderId: messageObj.senderId, timestamp: Date.now() }));
    } catch (err) {
      logger.error({ err }, 'Failed to send chunk complete');
    }
  }

  private enqueuePendingRecord(record: MessageRecord, to: string): void {
    if (this.pendingMessages.has(record.id)) return;
    this.pendingMessages.set(record.id, { record, attempts: 0, timeout: null, to });
    if (this.transport && this.transport.isConnected()) {
      this.attemptSendPending(record.id);
    }
  }

  private attemptSendPending(messageId: string): void {
    const pending = this.pendingMessages.get(messageId);
    if (!pending) return;
    if (!this.transport || !this.transport.isConnected()) return;

    pending.attempts += 1;
    const rec = pending.record;

    const payloadObj: any = {
      id: rec.id,
      chatId: rec.chatId,
      senderId: rec.from,
      text: rec.text,
      timestamp: rec.timestamp
    };

    try {
      const encoded = encodeBase64(JSON.stringify(payloadObj));
      this.transport.send(JSON.stringify({ type: 'SEND', to: pending.to.toUpperCase(), payload: encoded, id: rec.id }));
    } catch (err) {
      logger.error({ err }, 'Failed to send pending message');
    }

    if (pending.timeout) clearTimeout(pending.timeout as any);
    pending.timeout = setTimeout(() => {
      const p = this.pendingMessages.get(messageId);
      if (!p) return;
      if (p.attempts < this.MAX_RETRIES) {
        this.attemptSendPending(messageId);
      } else {
        if (p.timeout) clearTimeout(p.timeout as any);
        this.pendingMessages.delete(messageId);
        this.updateMessageStatus(messageId, 'sent');
      }
    }, this.ACK_TIMEOUT);
  }

  private register(strategId: string): void {
    if (this.transport?.isConnected()) {
      this.transport.send(JSON.stringify({
        type: 'REGISTER',
        strategId: strategId
      }));
    }
  }

  // STAGE8: Initialize or load E2EE key pair
  private async initializeKeyPair(): Promise<void> {
    try {
      const existingKeyPair = await getKeyPair();
      if (existingKeyPair) {
        // Load existing key pair
        this.myPublicKey = existingKeyPair.publicKey;
        this.myPrivateKey = await importPrivateKey(existingKeyPair.privateKey);
        console.log('🔐 Loaded existing E2EE key pair');
      } else {
        // Generate new key pair
        const keyPair = await generateKeyPair();
        const publicKeyBase64 = await exportPublicKey(keyPair.publicKey);
        const privateKeyArrayBuffer = await window.crypto.subtle.exportKey('pkcs8', keyPair.privateKey);

        this.myPublicKey = publicKeyBase64;
        this.myPrivateKey = keyPair.privateKey;

        // Save to IndexedDB
        await saveKeyPair({
          id: 'my_keypair',
          privateKey: privateKeyArrayBuffer,
          publicKey: publicKeyBase64
        });

        console.log('🔐 Generated new E2EE key pair');
      }

      // Send public key to coordinator
      if (this.transport?.isConnected() && this.myPublicKey && this.connectionState.currentStrategId) {
        this.transport.send(JSON.stringify({
          type: 'public_key',
          publicKey: this.myPublicKey,
          strategId: this.connectionState.currentStrategId
        }));
        console.log('🔐 Sent public key to coordinator');
      }
    } catch (error) {
      // STAGE8: Gracefully handle crypto errors (e.g., in test environments)
      console.error('Failed to initialize key pair:', error);
      // Continue without encryption if crypto fails
      this.myPublicKey = null;
      this.myPrivateKey = null;
    }
  }

  // STAGE8: Request public key for a contact
  private requestPublicKey(contactId: string): void {
    if (this.transport?.isConnected()) {
      this.transport.send(JSON.stringify({
        type: 'request_key',
        targetId: contactId
      }));
      console.log(`🔐 Requested public key for ${contactId}`);
    }
  }

  // STAGE8: Get or derive shared secret for a contact
  private async getSharedSecret(contactId: string): Promise<CryptoKey | null> {
    try {
      const contactKey = await getContactKey(contactId);
      if (contactKey?.sharedSecret) {
        return await importSharedSecret(contactKey.sharedSecret);
      }
      return null;
    } catch (error) {
      console.error('Failed to get shared secret:', error);
      return null;
    }
  }

  // STAGE8: Save shared secret for a contact
  private async saveSharedSecret(contactId: string, sharedSecret: CryptoKey): Promise<void> {
    try {
      const sharedSecretArrayBuffer = await exportSharedSecret(sharedSecret);
      const existingContactKey = await getContactKey(contactId);
      await saveContactKey({
        contactId,
        publicKey: existingContactKey?.publicKey || '',
        sharedSecret: sharedSecretArrayBuffer
      });
    } catch (error) {
      console.error('Failed to save shared secret:', error);
    }
  }

  // STAGE8: Handle public key response from coordinator
  private async handlePublicKeyResponse(data: { targetId: string; publicKey: string }): Promise<void> {
    try {
      const { targetId, publicKey } = data;
      if (!this.myPrivateKey || !publicKey) {
        console.warn('Cannot handle public key response: missing private key or public key');
        return;
      }

      // Save contact's public key
      await saveContactKey({
        contactId: targetId,
        publicKey
      });

      // Derive shared secret
      const contactPublicKey = await importPublicKey(publicKey);
      const sharedSecret = await deriveSharedSecret(this.myPrivateKey, contactPublicKey);

      // Save shared secret
      await this.saveSharedSecret(targetId, sharedSecret);

      console.log(`🔐 Derived and saved shared secret for ${targetId}`);
    } catch (error) {
      console.error('Failed to handle public key response:', error);
    }
  }

  // STAGE8: Handle incoming encrypted message
  private async handleEncryptedMessage(data: {
    ciphertext: string;
    iv: string;
    senderPublicKey?: string;
    from?: string;
    messageId?: string;
    timestamp?: number;
  }): Promise<void> {
    try {
      const { ciphertext, iv, senderPublicKey, from, messageId, timestamp } = data;
      const senderId = from || '';

      // Try to get existing shared secret
      let sharedSecret = await this.getSharedSecret(senderId);

      // If no shared secret but sender's public key is provided, derive it
      if (!sharedSecret && senderPublicKey && this.myPrivateKey) {
        try {
          const pubKey = await importPublicKey(senderPublicKey);
          sharedSecret = await deriveSharedSecret(this.myPrivateKey, pubKey);
          await this.saveSharedSecret(senderId, sharedSecret);
          console.log(`🔐 Derived shared secret from incoming message for ${senderId}`);
        } catch (error) {
          console.error('Failed to derive shared secret from sender public key:', error);
        }
      }

      if (!sharedSecret) {
        // Cannot decrypt - show placeholder
        const msgId = messageId || `enc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const encryptedMessage: Message = {
          id: msgId,
          text: '🔒 Зашифрованное сообщение',
          isUser: false,
          timestamp: timestamp || Date.now(),
          from: senderId,
          status: 'delivered',
          isEncrypted: true,
        };

        this.messages.push(encryptedMessage);
        this.persistMessageState(encryptedMessage);
        this.sortMessages();
        this.notifyMessagesChange();
        this.notifyMessageReceived(encryptedMessage);
        console.warn(`🔐 Cannot decrypt message from ${senderId}: no shared secret`);
        return;
      }

      // Decrypt the message
      const plaintext = await decryptMessage(ciphertext, iv, sharedSecret);
      const msgId = messageId || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const decryptedMessage: Message = {
        id: msgId,
        text: plaintext,
        isUser: false,
        timestamp: timestamp || Date.now(),
        from: senderId,
        status: 'delivered',
        isEncrypted: false,
      };

      this.messages.push(decryptedMessage);
      this.persistMessageState(decryptedMessage);
      this.sortMessages();
      this.notifyMessagesChange();
      this.notifyMessageReceived(decryptedMessage);

      // Notifications
      if (typeof document !== 'undefined' && document.hidden) {
        playNotificationSound();
      }

      if (isNotificationsEnabled()) {
        this.incrementUnreadCount(senderId);
        if (typeof document !== 'undefined' && document.hidden) {
          this.showBrowserNotification(senderId, plaintext);
        }
        this.vibrateForMobile();
      }

      if (typeof document !== 'undefined' && document.hidden) {
        this.sendPushNotification(senderId, plaintext);
      }

      // Save to IndexedDB
      const record: MessageRecord = {
        id: msgId,
        chatId: senderId,
        text: plaintext,
        from: senderId,
        to: this.connectionState.currentStrategId!,
        timestamp: timestamp || Date.now(),
        isUser: false,
        delivered: true,
      };
      saveMessage(record).catch(err => logger.error({ err }, 'Failed to save message'));
      void getOrCreateContact(senderId.toUpperCase()).then((contact) => {
        void updateContact(contact.id, {
          lastMessage: plaintext,
          lastMessageAt: timestamp || Date.now(),
        });
      });

      this.sendAck(msgId);
      sendBroadcast('NEW_MESSAGE', { message: decryptedMessage, chatId: senderId });

      console.log(`🔐 Decrypted message from ${senderId}`);
    } catch (error) {
      console.error('Failed to handle encrypted message:', error);
      // Show error placeholder
      const msgId = data.messageId || `enc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const errorMessage: Message = {
        id: msgId,
        text: '🔒 Ошибка расшифровки',
        isUser: false,
        timestamp: data.timestamp || Date.now(),
        from: data.from || '',
        status: 'delivered',
        isEncrypted: true,
      };

      this.messages.push(errorMessage);
      this.persistMessageState(errorMessage);
      this.sortMessages();
      this.notifyMessagesChange();
      this.notifyMessageReceived(errorMessage);
    }
  }

  private generateStrategId(): string {
    return 'STRATEG-' + Math.random().toString(36).substr(2, 9).toUpperCase();
  }

  resetId(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('strateg-id');
    }
    this.connectionState.currentStrategId = this.generateStrategId();
    if (typeof window !== 'undefined') {
      localStorage.setItem('strateg-id', this.connectionState.currentStrategId);
    }
    // Broadcast об изменении ID
    sendBroadcast('ID_CHANGED', { strategId: this.connectionState.currentStrategId });
  }

  private clearIntervals(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    if (this.pongTimeout) {
      clearTimeout(this.pongTimeout);
      this.pongTimeout = null;
    }
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
  
  private startPingInterval(): void {
    this.pingInterval = setInterval(() => {
      if (this.transport?.isConnected()) {
        this.transport.send(JSON.stringify({ type: 'PING', timestamp: Date.now() }));

        if (Date.now() - this.lastPong > this.PONG_TIMEOUT) {
          this.missedPings++;
          console.warn(`Missed PONG (${this.missedPings}/${this.MAX_MISSED_PINGS})`);

          if (this.missedPings >= this.MAX_MISSED_PINGS) {
            console.error('Too many missed PONGs, reconnecting');
            this.notifyError('Потеряно соединение, переподключение...');
            this.transport?.disconnect();
          }
        }
      }
    }, this.PING_INTERVAL);
  }
  
  private sendAck(messageId: string): void {
    if (this.transport?.isConnected()) {
      this.transport.send(JSON.stringify({
        type: 'ACK',
        messageId,
        timestamp: Date.now()
      }));
    }
  }
  
  private notifyError(error: string): void {
    this.errorCallbacks.forEach(callback => callback(error));
  }
  
  private sortMessages(): void {
    this.messages.sort((a, b) => a.timestamp - b.timestamp);
  }

  async loadHistory(chatId: string): Promise<MessageRecord[]> {
    this.currentChatId = chatId;
    const records = await getMessages(chatId);
    
    this.messages = records.map(r => this.restoreMessageState({
      id: r.id,
      text: r.text,
      isUser: r.isUser,
      timestamp: r.timestamp,
      from: r.from,
      isDeleted: this.deletedMessageIds.has(r.id),
      status: (r as any).status ? (r as any).status : (r.isUser ? 'pending' : 'delivered'),
      replyTo: r.replyTo,
    }));
    
    this.sortMessages();
    this.notifyMessagesChange();
    return records;
  }
  
  switchChat(chatId: string): void {
    this.currentChatId = chatId;
    this.resetUnreadCount(chatId);
    if (typeof window !== 'undefined') {
      localStorage.setItem('strateg-last-chat', chatId);
    }

    const unreadMessages = this.messages.filter((message) => !message.isUser && message.from?.trim().toUpperCase() === chatId.trim().toUpperCase() && message.status !== 'read');
    if (unreadMessages.length && this.transport?.isConnected()) {
      const readAt = Date.now();
      unreadMessages.forEach((message) => this.updateMessageStatus(message.id, 'read', readAt));
      this.transport.send(JSON.stringify({ type: 'read_receipt', messageIds: unreadMessages.map((message) => message.id), to: chatId.trim().toUpperCase() }));
    }

    sendBroadcast('CHAT_SWITCH', { chatId });
    this.notifyChatSwitch(chatId);
  }

  async clearChat(chatId: string): Promise<void> {
    const normalized = chatId.toUpperCase();
    if (typeof window !== 'undefined') {
      // HOTFIX: remove legacy localStorage cache for this contact
      localStorage.removeItem(`strateg_messages_${normalized}`);
    }

    this.messages = [];
    this.notifyMessagesChange();

    const { getMessages: getMessagesFromDB, deleteMessage: deleteMessageFromDB } = await import('./db');
    const records = await getMessagesFromDB(normalized);
    for (const record of records) {
      await deleteMessageFromDB(record.id);
    }

    // HOTFIX: sync chat clear across tabs
    sendBroadcast('CHAT_CLEARED', { chatId: normalized });
  }

  async deleteMessage(messageId: string): Promise<void> {
    const message = this.messages.find(m => m.id === messageId);
    if (!message) {
      throw new Error('Message not found');
    }

    const isOwn = message.isUser && message.from === this.connectionState.currentStrategId;

    if (isOwn) {
      // BUGFIX 5: outgoing — hard delete (existing behaviour)
      this.messages = this.messages.filter(m => m.id !== messageId);
      this.notifyMessagesChange();

      const { deleteMessage: deleteMessageFromDB } = await import('./db');
      await deleteMessageFromDB(messageId);

      sendBroadcast('MESSAGE_DELETED', { messageId, hard: true });
      return;
    }

    // BUGFIX 5: incoming — soft delete, show placeholder
    this.deletedMessageIds.add(messageId);
    if (typeof window !== 'undefined') {
      localStorage.setItem(DELETED_MESSAGES_KEY, JSON.stringify([...this.deletedMessageIds]));
    }
    message.isDeleted = true;
    this.notifyMessagesChange();
    sendBroadcast('MESSAGE_DELETED', { messageId, hard: false });
  }

  private applyDeletedFlag(message: Message): Message {
    if (this.deletedMessageIds.has(message.id)) {
      return { ...message, isDeleted: true };
    }
    return message;
  }
  
  private setupBroadcastListener(): void {
    onBroadcast((msg: BroadcastMessage) => {
      if (msg.type === 'NEW_MESSAGE' && msg.payload.chatId === this.currentChatId) {
        const message = msg.payload.message as Message;
        // Проверяем дубликаты
        if (!this.receivedMessageIds.has(message.id)) {
          this.receivedMessageIds.add(message.id);
          this.messages.push(message);
          this.sortMessages();
          this.notifyMessagesChange();
          this.notifyMessageReceived(message);

          const record: MessageRecord = {
            id: message.id,
            chatId: msg.payload.chatId,
            text: message.text,
            from: message.from ?? msg.payload.chatId,
            to: this.connectionState.currentStrategId ?? '',
            timestamp: message.timestamp,
            isUser: message.isUser,
            delivered: message.isUser ? false : true,
            replyTo: message.replyTo,
          };
          saveMessage(record).catch(err => logger.error({ err }, 'Failed to save broadcast message'));
        }
      } else if (msg.type === 'CHAT_SWITCH') {
        const chatId = msg.payload.chatId as string;
        this.currentChatId = chatId;
        this.notifyChatSwitch(chatId);
        this.loadHistory(chatId).catch(err => logger.error({ err }, 'Failed to load history on chat switch'));
      } else if (msg.type === 'ID_CHANGED') {
        this.connectionState.currentStrategId = msg.payload.strategId;
        this.updateConnectionState({ ...this.connectionState });
      } else if (msg.type === 'MESSAGE_DELETED') {
        // BUGFIX 5: sync soft/hard delete across tabs
        const messageId = msg.payload.messageId as string;
        const hard = msg.payload.hard === true;
        if (hard) {
          this.messages = this.messages.filter(m => m.id !== messageId);
          this.notifyMessagesChange();
        } else {
          this.deletedMessageIds.add(messageId);
          if (typeof window !== 'undefined') {
            localStorage.setItem(DELETED_MESSAGES_KEY, JSON.stringify([...this.deletedMessageIds]));
          }
          const target = this.messages.find(m => m.id === messageId);
          if (target) {
            target.isDeleted = true;
            this.notifyMessagesChange();
          }
        }
      } else if (msg.type === 'CHAT_CLEARED') {
        // HOTFIX: sync chat clear across tabs
        const clearedChatId = msg.payload.chatId as string;
        if (clearedChatId === this.currentChatId) {
          this.messages = [];
          this.notifyMessagesChange();
        }
      }
    });
  }
  
  private async seedContactsFromHistory(): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
      const { getAllMessageChatIds } = await import('./db');
      const chatIds = await getAllMessageChatIds();
      for (const chatId of chatIds) {
        const normalized = chatId.toUpperCase();
        if (!/^STRATEG-[A-Z0-9]{9}$/.test(normalized)) continue;
        const contact = await getOrCreateContact(normalized);
        if (!contact.lastMessageAt) {
          await updateContact(contact.id, { name: contact.name || normalized });
        }
      }
    } catch (err) {
      console.error('Failed to seed contacts from history:', err);
    }
  }

  private runCleanup(): void {
    deleteOldMessages(this.CLEANUP_INTERVAL_DAYS)
      .then(deleted => {
        if (deleted > 0) {
          logger.info({ deleted }, 'Cleaned up old messages');
        }
      })
      .catch(err => logger.error({ err }, 'Cleanup failed'));
  }

  private startCleanup(): void {
    // Cleanup раз в день
    this.cleanupInterval = setInterval(() => {
      this.runCleanup();
    }, 24 * 60 * 60 * 1000);
  }

  private async requestPushSubscription(): Promise<void> {
    if (typeof window === 'undefined') return;
    
    // Check if already subscribed
    if (localStorage.getItem('strateg-push-subscribed') === 'true') {
      return;
    }

    // Check if push is supported
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.log('Push notifications not supported');
      return;
    }

    try {
      const { subscribeToPush } = await import('./pushNotifications.js');
      await subscribeToPush();
    } catch (error) {
      console.error('Failed to request push subscription:', error);
    }
  }

  private async sendPushNotification(from: string, text: string): Promise<void> {
    if (typeof window === 'undefined') return;
    
    try {
      // Send push notification via server
      await fetch('/api/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: this.connectionState.currentStrategId,
          title: `Сообщение от ${from}`,
          body: text.length > 100 ? text.substring(0, 100) + '...' : text,
          data: { from }
        })
      });
    } catch (error) {
      console.error('Failed to send push notification:', error);
    }
  }

  private handleGroupMessage(data: {
    id: string;
    roomId: string;
    senderId: string;
    text?: string;
    files?: FileAttachment[];
    timestamp: number;
  }): void {
    // Save to IndexedDB
    saveGroupMessage({
      id: data.id,
      roomId: data.roomId,
      senderId: data.senderId,
      text: data.text,
      files: data.files ? JSON.stringify(data.files) : undefined,
      timestamp: data.timestamp
    }).catch(err => logger.error({ err }, 'Failed to save group message'));

    // Notify listeners
    this.notifyGroupMessageReceived(data);
  }

  private async handleGroupCreate(data: {
    roomId: string;
    name: string;
    creatorId: string;
    members: string[];
    avatarId?: string; // STAGE6: optional avatar
  }): Promise<void> {
    // Save group to IndexedDB
    saveGroupChat({
      id: data.roomId,
      name: data.name,
      creatorId: data.creatorId,
      members: data.members,
      avatarId: data.avatarId || 'avatar-robot', // STAGE6: include avatar
      createdAt: Date.now()
    }).catch(err => logger.error({ err }, 'Failed to save group'));

    this.notifyGroupUpdate({ roomId: data.roomId, action: 'create' });
  }

  private async handleGroupJoin(data: {
    roomId: string;
    userId: string;
  }): Promise<void> {
    const group = await getGroupChat(data.roomId);
    if (group && !group.members.includes(data.userId)) {
      group.members.push(data.userId);
      await updateGroupChat(data.roomId, { members: group.members });
    }
    this.notifyGroupUpdate({ roomId: data.roomId, action: 'join', userId: data.userId });
  }

  private async handleGroupLeave(data: {
    roomId: string;
    userId: string;
  }): Promise<void> {
    const group = await getGroupChat(data.roomId);
    if (group) {
      group.members = group.members.filter(m => m !== data.userId);
      await updateGroupChat(data.roomId, { members: group.members });
    }
    this.notifyGroupUpdate({ roomId: data.roomId, action: 'leave', userId: data.userId });
  }

  private updateConnectionState(newState: ConnectionState): void {
    this.connectionState = newState;
    this.connectionCallbacks.forEach(callback => callback(newState));
  }

  private notifyMessagesChange(): void {
    this.messagesCallbacks.forEach(callback => callback([...this.messages]));
  }

  private notifyMessageReceived(message: Message): void {
    this.messageCallbacks.forEach(callback => callback(message));
  }

  private notifyGroupMessageReceived(message: {
    id: string;
    roomId: string;
    senderId: string;
    text?: string;
    files?: FileAttachment[];
    timestamp: number;
  }): void {
    this.groupMessageCallbacks.forEach(callback => callback(message));
  }

  private notifyGroupUpdate(update: {
    roomId: string;
    action: 'create' | 'join' | 'leave';
    userId?: string;
  }): void {
    this.groupUpdateCallbacks.forEach(callback => callback(update));
  }

  private notifyChatSwitch(chatId: string): void {
    this.chatSwitchCallbacks.forEach(callback => callback(chatId));
  }

  onChatSwitch(callback: (chatId: string) => void): () => void {
    this.chatSwitchCallbacks.push(callback);
    return () => {
      const index = this.chatSwitchCallbacks.indexOf(callback);
      if (index > -1) this.chatSwitchCallbacks.splice(index, 1);
    };
  }

  onConnectionChange(callback: (state: ConnectionState) => void): () => void {
    this.connectionCallbacks.push(callback);
    return () => {
      const index = this.connectionCallbacks.indexOf(callback);
      if (index > -1) this.connectionCallbacks.splice(index, 1);
    };
  }

  onMessagesChange(callback: (messages: Message[]) => void): () => void {
    this.messagesCallbacks.push(callback);
    return () => {
      const index = this.messagesCallbacks.indexOf(callback);
      if (index > -1) this.messagesCallbacks.splice(index, 1);
    };
  }

  onMessageReceived(callback: (message: Message) => void): () => void {
    this.messageCallbacks.push(callback);
    return () => {
      const index = this.messageCallbacks.indexOf(callback);
      if (index > -1) this.messageCallbacks.splice(index, 1);
    };
  }
  
  onError(callback: (error: string) => void): () => void {
    this.errorCallbacks.push(callback);
    return () => {
      const index = this.errorCallbacks.indexOf(callback);
      if (index > -1) this.errorCallbacks.splice(index, 1);
    };
  }

  onGroupMessageReceived(callback: (message: {
    id: string;
    roomId: string;
    senderId: string;
    text?: string;
    files?: FileAttachment[];
    timestamp: number;
  }) => void): () => void {
    this.groupMessageCallbacks.push(callback);
    return () => {
      const index = this.groupMessageCallbacks.indexOf(callback);
      if (index > -1) this.groupMessageCallbacks.splice(index, 1);
    };
  }

  onGroupUpdate(callback: (update: {
    roomId: string;
    action: 'create' | 'join' | 'leave';
    userId?: string;
  }) => void): () => void {
    this.groupUpdateCallbacks.push(callback);
    return () => {
      const index = this.groupUpdateCallbacks.indexOf(callback);
      if (index > -1) this.groupUpdateCallbacks.splice(index, 1);
    };
  }

  onQRSignal(callback: (sdp: string) => void): () => void {
    this.qrSignalCallbacks.push(callback);
    return () => {
      const idx = this.qrSignalCallbacks.indexOf(callback);
      if (idx > -1) this.qrSignalCallbacks.splice(idx, 1);
    };
  }

  async acceptRemoteSignal(sdpData: string): Promise<void> {
    // If we already have a transport, delegate to it
    if (this.transport && typeof (this.transport as any).setRemoteSDP === 'function') {
      await (this.transport as any).setRemoteSDP(sdpData);
      return;
    }

    // Otherwise use p2p acceptOffer flow to establish a transport and attach it
    try {
      const t = await acceptOffer(sdpData);
      this.transport = t as unknown as ITransport;
      // basic message relay (text/json)
      (this.transport as any).onMessage((data: any) => {
        try {
          if (typeof data === 'string') {
            const parsed = parseWirePayload(data);
            const from = (parsed && parsed.replyTo && (parsed as any).senderId) || 'unknown';
            this.handleIncomingMessage({ id: `msg_${Date.now()}`, from, text: parsed.text || '', files: parsed.files, timestamp: Date.now() });
            return;
          }
          // if transport sends structured objects
          if (data && typeof data === 'object' && data.type === 'MESSAGE' && data.payload) {
            const parsed = parseWirePayload(data.payload);
            this.handleIncomingMessage({ id: data.id || `msg_${Date.now()}`, from: data.from || 'unknown', text: parsed.text || '', files: parsed.files, timestamp: data.timestamp || Date.now() });
          }
        } catch (e) { console.error(e); }
      });
      if (typeof (this.transport as any).onBinary === 'function') {
        (this.transport as any).onBinary((payload: { fileId: string; data: ArrayBuffer; meta?: any }) => {
          try { this.handleIncomingBinary(payload); } catch (e) { console.error(e); }
        });
      }
      (this.transport as any).onQRGenerated((sdp: string) => this.qrSignalCallbacks.forEach(cb => cb(sdp)));
    } catch (err) {
      throw err;
    }
  }
}

// Singleton instance
let coreInstance: StrategDialogCore | null = null;

export const getDialogCore = (): StrategDialogCore => {
  if (!coreInstance) {
    coreInstance = new StrategDialogCore();
  }
  return coreInstance;
};

export { StrategDialogCore as ZimaDialogCore };

