// IndexedDB модуль для хранения истории сообщений

import type { ReplyTo } from '../types/message';

export interface MessageRecord {
  id: string;
  chatId: string;
  text: string;
  from: string;
  to: string;
  timestamp: number;
  isUser: boolean;
  delivered: boolean;
  status?: 'sent' | 'delivered' | 'read';
  readAt?: number;
  replyTo?: ReplyTo;
  context?: {
    type: 'deal' | 'barter' | 'project';
    id: string;
    title?: string;
  };
}

export interface ChatRecord {
  chatId: string;
  lastMessage: string;
  lastTimestamp: number;
  unreadCount: number;
}

export interface GroupChatRecord {
  id: string; // ROOM-XXX
  name: string;
  creatorId: string;
  members: string[];
  avatarId: string; // STAGE6: group avatar
  createdAt: number;
}

export interface GroupMessageRecord {
  id: string;
  roomId: string;
  senderId: string;
  text?: string;
  files?: string; // JSON string of FileAttachment[]
  timestamp: number;
}

// STAGE8: E2EE key storage interfaces
export interface KeyStore {
  id: 'my_keypair'; // одна запись на устройство
  privateKey: ArrayBuffer; // экспортированный приватный ключ
  publicKey: string; // base64 публичный ключ
}

export interface ContactKey {
  contactId: string;
  publicKey: string; // base64 публичный ключ контакта
  sharedSecret?: ArrayBuffer; // производный секрет (кеш)
}

const DB_NAME = 'strateg-russia';
const DB_VERSION = 5; // STAGE8: incremented for key storage; bumped to add context indexes
const MESSAGES_STORE = 'messages';
const CHATS_STORE = 'chats';
const CONTACTS_STORE = 'contacts';
const GROUP_CHATS_STORE = 'groupChats';
const GROUP_MESSAGES_STORE = 'groupMessages';
// STAGE8: E2EE key storage
const KEYPAIR_STORE = 'keypair';
const CONTACT_KEYS_STORE = 'contactKeys';

let db: IDBDatabase | null = null;
let fallbackMemory: Map<string, MessageRecord[]> = new Map();
let fallbackChats: Map<string, ChatRecord> = new Map();
let fallbackGroupChats: Map<string, GroupChatRecord> = new Map();
let fallbackGroupMessages: Map<string, GroupMessageRecord[]> = new Map();
let useFallback = false;

export async function openDB(): Promise<void> {
  if (db) return;

  try {
    db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('IndexedDB error:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const database = (event.target as IDBOpenDBRequest).result;

        // Создание хранилища сообщений
        if (!database.objectStoreNames.contains(MESSAGES_STORE)) {
          const messagesStore = database.createObjectStore(MESSAGES_STORE, { keyPath: 'id' });
          messagesStore.createIndex('chatId', 'chatId', { unique: false });
          messagesStore.createIndex('timestamp', 'timestamp', { unique: false });
          // Индексы для быстрого поиска по контексту
          messagesStore.createIndex('contextType', 'context.type', { unique: false });
          messagesStore.createIndex('contextId', 'context.id', { unique: false });
        }

        // Создание хранилища чатов
        if (!database.objectStoreNames.contains(CHATS_STORE)) {
          const chatsStore = database.createObjectStore(CHATS_STORE, { keyPath: 'chatId' });
          chatsStore.createIndex('lastTimestamp', 'lastTimestamp', { unique: false });
        }

        // Создание хранилища контактов
        if (!database.objectStoreNames.contains(CONTACTS_STORE)) {
          const contactsStore = database.createObjectStore(CONTACTS_STORE, { keyPath: 'id' });
          contactsStore.createIndex('lastMessageAt', 'lastMessageAt', { unique: false });
        }

        // Создание хранилища групповых чатов
        if (!database.objectStoreNames.contains(GROUP_CHATS_STORE)) {
          const groupChatsStore = database.createObjectStore(GROUP_CHATS_STORE, { keyPath: 'id' });
          groupChatsStore.createIndex('members', 'members', { unique: false, multiEntry: true });
          groupChatsStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // Создание хранилища групповых сообщений
        if (!database.objectStoreNames.contains(GROUP_MESSAGES_STORE)) {
          const groupMessagesStore = database.createObjectStore(GROUP_MESSAGES_STORE, { keyPath: 'id' });
          groupMessagesStore.createIndex('roomId', 'roomId', { unique: false });
          groupMessagesStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // STAGE8: Создание хранилища ключевой пары
        if (!database.objectStoreNames.contains(KEYPAIR_STORE)) {
          database.createObjectStore(KEYPAIR_STORE, { keyPath: 'id' });
        }

        // STAGE8: Создание хранилища ключей контактов
        if (!database.objectStoreNames.contains(CONTACT_KEYS_STORE)) {
          const contactKeysStore = database.createObjectStore(CONTACT_KEYS_STORE, { keyPath: 'contactId' });
          contactKeysStore.createIndex('contactId', 'contactId', { unique: true });
        }
      };
    });

    console.log('📦 IndexedDB opened successfully');
  } catch {
    console.warn('IndexedDB not available, using fallback memory storage');
    useFallback = true;
  }
}

export function getDBInstance(): IDBDatabase | null {
  return db;
}

export async function saveMessage(msg: MessageRecord): Promise<void> {
  if (useFallback) {
    const chatMessages = fallbackMemory.get(msg.chatId) || [];
    const existing = chatMessages.find(m => m.id === msg.id);
    if (existing) {
      Object.assign(existing, msg);
    } else {
      chatMessages.push(msg);
    }
    chatMessages.sort((a, b) => a.timestamp - b.timestamp);
    fallbackMemory.set(msg.chatId, chatMessages);

    const chatRecord: ChatRecord = {
      chatId: msg.chatId,
      lastMessage: msg.text,
      lastTimestamp: msg.timestamp,
      unreadCount: msg.isUser ? 0 : (fallbackChats.get(msg.chatId)?.unreadCount ?? 0) + 1
    };
    if (msg.isUser) chatRecord.unreadCount = 0;
    fallbackChats.set(msg.chatId, chatRecord);
    return;
  }

  if (!db) await openDB();

  return new Promise<void>((resolve, reject) => {
    const transaction = db!.transaction([MESSAGES_STORE, CHATS_STORE], 'readwrite');
    const messagesStore = transaction.objectStore(MESSAGES_STORE);
    const chatsStore = transaction.objectStore(CHATS_STORE);

    // Сохранение сообщения
    messagesStore.put(msg);

    // Обновление метаданных чата
    const chatRecord: ChatRecord = {
      chatId: msg.chatId,
      lastMessage: msg.text,
      lastTimestamp: msg.timestamp,
      unreadCount: msg.isUser ? 0 : 1 // Если входящее, увеличиваем unread
    };

    const getRequest = chatsStore.get(msg.chatId);
    getRequest.onsuccess = () => {
      const existing = getRequest.result;
      if (existing) {
        chatRecord.unreadCount = msg.isUser ? 0 : existing.unreadCount + 1;
      }
      chatsStore.put(chatRecord);
    };

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function getMessages(chatId: string, limit?: number): Promise<MessageRecord[]> {
  if (useFallback) {
    const messages = fallbackMemory.get(chatId) || [];
    return limit ? messages.slice(-limit) : messages;
  }

  if (!db) await openDB();

  return new Promise<MessageRecord[]>((resolve, reject) => {
    const transaction = db!.transaction([MESSAGES_STORE], 'readonly');
    const store = transaction.objectStore(MESSAGES_STORE);
    const index = store.index('chatId');
    const request = index.getAll(chatId);

    request.onsuccess = () => {
      let messages = request.result.sort((a, b) => a.timestamp - b.timestamp);
      if (limit) {
        messages = messages.slice(-limit);
      }
      resolve(messages);
    };

    request.onerror = () => reject(request.error);
  });
}

export async function getMessagesByContext(contextType: string, contextId: string, limit?: number): Promise<MessageRecord[]> {
  if (useFallback) {
    const all = Array.from(fallbackMemory.values()).flat();
    const filtered = all.filter(m => m.context && m.context.type === contextType && m.context.id === contextId);
    const sorted = filtered.sort((a, b) => a.timestamp - b.timestamp);
    return limit ? sorted.slice(-limit) : sorted;
  }

  if (!db) await openDB();

  return new Promise<MessageRecord[]>((resolve, reject) => {
    try {
      const transaction = db!.transaction([MESSAGES_STORE], 'readonly');
      const store = transaction.objectStore(MESSAGES_STORE);
      // Use contextId index to narrow results
      const index = store.index('contextId');
      const request = index.getAll(contextId);

      request.onsuccess = () => {
        let messages = (request.result as MessageRecord[]).filter(m => m.context && m.context.type === contextType);
        messages = messages.sort((a, b) => a.timestamp - b.timestamp);
        if (limit) messages = messages.slice(-limit);
        resolve(messages);
      };

      request.onerror = () => reject(request.error);
    } catch (err) {
      reject(err);
    }
  });
}

export async function getAllChats(): Promise<ChatRecord[]> {
  if (useFallback) {
    return Array.from(fallbackChats.values());
  }

  if (!db) await openDB();

  return new Promise<ChatRecord[]>((resolve, reject) => {
    const transaction = db!.transaction([CHATS_STORE], 'readonly');
    const store = transaction.objectStore(CHATS_STORE);
    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result.sort((a, b) => b.lastTimestamp - a.lastTimestamp));
    };

    request.onerror = () => reject(request.error);
  });
}

export async function getAllMessageChatIds(): Promise<string[]> {
  if (useFallback) {
    return Array.from(fallbackMemory.keys());
  }

  if (!db) await openDB();

  return new Promise<string[]>((resolve, reject) => {
    const transaction = db!.transaction([MESSAGES_STORE], 'readonly');
    const store = transaction.objectStore(MESSAGES_STORE);
    const request = store.getAll();

    request.onsuccess = () => {
      const chatIds = Array.from(new Set((request.result as MessageRecord[]).map((msg) => msg.chatId)));
      resolve(chatIds);
    };

    request.onerror = () => reject(request.error);
  });
}

export async function updateChatMeta(chatId: string, meta: Partial<ChatRecord>): Promise<void> {
  if (useFallback) {
    const existing = fallbackChats.get(chatId);
    if (existing) {
      fallbackChats.set(chatId, { ...existing, ...meta });
    }
    return;
  }

  if (!db) await openDB();

  return new Promise<void>((resolve, reject) => {
    const transaction = db!.transaction([CHATS_STORE], 'readwrite');
    const store = transaction.objectStore(CHATS_STORE);
    const getRequest = store.get(chatId);

    getRequest.onsuccess = () => {
      const existing = getRequest.result;
      if (existing) {
        store.put({ ...existing, ...meta });
      }
    };

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function markMessageDelivered(messageId: string): Promise<void> {
  if (useFallback) {
    for (const chatMessages of fallbackMemory.values()) {
      const msg = chatMessages.find(m => m.id === messageId);
      if (msg) {
        msg.delivered = true;
        break;
      }
    }
    return;
  }

  if (!db) await openDB();

  return new Promise<void>((resolve, reject) => {
    const transaction = db!.transaction([MESSAGES_STORE], 'readwrite');
    const store = transaction.objectStore(MESSAGES_STORE);
    const getRequest = store.get(messageId);

    getRequest.onsuccess = () => {
      const msg = getRequest.result;
      if (msg) {
        msg.delivered = true;
        store.put(msg);
      }
    };

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function deleteOldMessages(maxAgeDays: number = 30): Promise<number> {
  const cutoffTime = Date.now() - (maxAgeDays * 24 * 60 * 60 * 1000);
  let deletedCount = 0;

  if (useFallback) {
    for (const [chatId, messages] of fallbackMemory.entries()) {
      const filtered = messages.filter(m => m.timestamp > cutoffTime);
      deletedCount += messages.length - filtered.length;
      fallbackMemory.set(chatId, filtered);
    }
    return deletedCount;
  }

  if (!db) await openDB();

  return new Promise<number>((resolve, reject) => {
    const transaction = db!.transaction([MESSAGES_STORE], 'readwrite');
    const store = transaction.objectStore(MESSAGES_STORE);
    const index = store.index('timestamp');
    const request = index.openCursor(IDBKeyRange.upperBound(cutoffTime));

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        cursor.delete();
        deletedCount++;
        cursor.continue();
      }
    };

    transaction.oncomplete = () => resolve(deletedCount);
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function deleteMessage(messageId: string): Promise<void> {
  if (useFallback) {
    for (const [chatId, messages] of fallbackMemory.entries()) {
      const filtered = messages.filter(m => m.id !== messageId);
      if (filtered.length !== messages.length) {
        fallbackMemory.set(chatId, filtered);
        return;
      }
    }
    return;
  }

  if (!db) await openDB();

  return new Promise<void>((resolve, reject) => {
    const transaction = db!.transaction([MESSAGES_STORE], 'readwrite');
    const store = transaction.objectStore(MESSAGES_STORE);
    store.delete(messageId);

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

/** @internal Сброс состояния модуля (только для unit-тестов) */
export async function __resetDbForTests(): Promise<void> {
  if (db) {
    db.close();
    db = null;
  }
  fallbackMemory = new Map();
  fallbackChats = new Map();
  fallbackGroupChats = new Map();
  fallbackGroupMessages = new Map();
  useFallback = false;

  if (typeof indexedDB !== 'undefined') {
    await new Promise<void>((resolve) => {
      const request = indexedDB.deleteDatabase(DB_NAME);
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
      request.onblocked = () => resolve();
    });
  }
}

// Group chat functions

export async function saveGroupChat(group: GroupChatRecord): Promise<void> {
  if (useFallback) {
    fallbackGroupChats.set(group.id, group);
    return;
  }

  if (!db) await openDB();

  return new Promise<void>((resolve, reject) => {
    const transaction = db!.transaction([GROUP_CHATS_STORE], 'readwrite');
    const store = transaction.objectStore(GROUP_CHATS_STORE);
    store.put(group);

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function getGroupChats(): Promise<GroupChatRecord[]> {
  if (useFallback) {
    return Array.from(fallbackGroupChats.values());
  }

  if (!db) await openDB();

  return new Promise<GroupChatRecord[]>((resolve, reject) => {
    const transaction = db!.transaction([GROUP_CHATS_STORE], 'readonly');
    const store = transaction.objectStore(GROUP_CHATS_STORE);
    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result.sort((a, b) => b.createdAt - a.createdAt));
    };

    request.onerror = () => reject(request.error);
  });
}

export async function getGroupChat(roomId: string): Promise<GroupChatRecord | null> {
  if (useFallback) {
    return fallbackGroupChats.get(roomId) || null;
  }

  if (!db) await openDB();

  return new Promise<GroupChatRecord | null>((resolve, reject) => {
    const transaction = db!.transaction([GROUP_CHATS_STORE], 'readonly');
    const store = transaction.objectStore(GROUP_CHATS_STORE);
    const request = store.get(roomId);

    request.onsuccess = () => {
      resolve(request.result || null);
    };

    request.onerror = () => reject(request.error);
  });
}

export async function deleteGroupChat(roomId: string): Promise<void> {
  if (useFallback) {
    fallbackGroupChats.delete(roomId);
    fallbackGroupMessages.delete(roomId);
    return;
  }

  if (!db) await openDB();

  return new Promise<void>((resolve, reject) => {
    const transaction = db!.transaction([GROUP_CHATS_STORE, GROUP_MESSAGES_STORE], 'readwrite');
    const groupChatsStore = transaction.objectStore(GROUP_CHATS_STORE);
    const groupMessagesStore = transaction.objectStore(GROUP_MESSAGES_STORE);

    groupChatsStore.delete(roomId);

    // Delete all messages for this room
    const index = groupMessagesStore.index('roomId');
    const request = index.openCursor(IDBKeyRange.only(roomId));
    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function saveGroupMessage(msg: GroupMessageRecord): Promise<void> {
  if (useFallback) {
    const roomMessages = fallbackGroupMessages.get(msg.roomId) || [];
    const existing = roomMessages.find(m => m.id === msg.id);
    if (existing) {
      Object.assign(existing, msg);
    } else {
      roomMessages.push(msg);
    }
    roomMessages.sort((a, b) => a.timestamp - b.timestamp);
    fallbackGroupMessages.set(msg.roomId, roomMessages);
    return;
  }

  if (!db) await openDB();

  return new Promise<void>((resolve, reject) => {
    const transaction = db!.transaction([GROUP_MESSAGES_STORE], 'readwrite');
    const store = transaction.objectStore(GROUP_MESSAGES_STORE);
    store.put(msg);

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function getGroupMessages(roomId: string, limit?: number): Promise<GroupMessageRecord[]> {
  if (useFallback) {
    const messages = fallbackGroupMessages.get(roomId) || [];
    return limit ? messages.slice(-limit) : messages;
  }

  if (!db) await openDB();

  return new Promise<GroupMessageRecord[]>((resolve, reject) => {
    const transaction = db!.transaction([GROUP_MESSAGES_STORE], 'readonly');
    const store = transaction.objectStore(GROUP_MESSAGES_STORE);
    const index = store.index('roomId');
    const request = index.getAll(roomId);

    request.onsuccess = () => {
      let messages = request.result.sort((a, b) => a.timestamp - b.timestamp);
      if (limit) {
        messages = messages.slice(-limit);
      }
      resolve(messages);
    };

    request.onerror = () => reject(request.error);
  });
}

export async function updateGroupChat(roomId: string, updates: Partial<GroupChatRecord>): Promise<void> {
  if (useFallback) {
    const existing = fallbackGroupChats.get(roomId);
    if (existing) {
      fallbackGroupChats.set(roomId, { ...existing, ...updates });
    }
    return;
  }

  if (!db) await openDB();

  return new Promise<void>((resolve, reject) => {
    const transaction = db!.transaction([GROUP_CHATS_STORE], 'readwrite');
    const store = transaction.objectStore(GROUP_CHATS_STORE);
    const getRequest = store.get(roomId);

    getRequest.onsuccess = () => {
      const existing = getRequest.result;
      if (existing) {
        store.put({ ...existing, ...updates });
      }
    };

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

// STAGE8: E2EE key storage functions

export async function saveKeyPair(keyStore: KeyStore): Promise<void> {
  if (useFallback) {
    console.warn('Key storage not available in fallback mode');
    return;
  }

  if (!db) await openDB();

  return new Promise<void>((resolve, reject) => {
    const transaction = db!.transaction([KEYPAIR_STORE], 'readwrite');
    const store = transaction.objectStore(KEYPAIR_STORE);
    store.put(keyStore);

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function getKeyPair(): Promise<KeyStore | null> {
  if (useFallback) {
    return null;
  }

  if (!db) await openDB();

  return new Promise<KeyStore | null>((resolve, reject) => {
    const transaction = db!.transaction([KEYPAIR_STORE], 'readonly');
    const store = transaction.objectStore(KEYPAIR_STORE);
    const request = store.get('my_keypair');

    request.onsuccess = () => {
      resolve(request.result || null);
    };

    request.onerror = () => reject(request.error);
  });
}

export async function saveContactKey(contactKey: ContactKey): Promise<void> {
  if (useFallback) {
    console.warn('Contact key storage not available in fallback mode');
    return;
  }

  if (!db) await openDB();

  return new Promise<void>((resolve, reject) => {
    const transaction = db!.transaction([CONTACT_KEYS_STORE], 'readwrite');
    const store = transaction.objectStore(CONTACT_KEYS_STORE);
    store.put(contactKey);

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function getContactKey(contactId: string): Promise<ContactKey | null> {
  if (useFallback) {
    return null;
  }

  if (!db) await openDB();

  return new Promise<ContactKey | null>((resolve, reject) => {
    const transaction = db!.transaction([CONTACT_KEYS_STORE], 'readonly');
    const store = transaction.objectStore(CONTACT_KEYS_STORE);
    const request = store.get(contactId);

    request.onsuccess = () => {
      resolve(request.result || null);
    };

    request.onerror = () => reject(request.error);
  });
}

