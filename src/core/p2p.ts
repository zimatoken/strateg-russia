// src/core/p2p.ts
// WebRTC-реализация ITransport с QR-сигналингом

import { ITransport } from './transport';
import { QRSignaling } from './signaling';

const CHUNK_SIZE = 16 * 1024; // 16KB

function encodeHeaderAndChunk(header: Record<string, any>, chunk: Uint8Array): ArrayBuffer {
  const headerStr = JSON.stringify(header);
  const encoder = new TextEncoder();
  const headerBytes = encoder.encode(headerStr);
  const headerLen = headerBytes.length;
  const buffer = new ArrayBuffer(4 + headerLen + chunk.byteLength);
  const view = new DataView(buffer);
  view.setUint32(0, headerLen);
  const uint8 = new Uint8Array(buffer);
  uint8.set(headerBytes, 4);
  uint8.set(chunk, 4 + headerLen);
  return buffer;
}

function decodeHeaderAndChunk(buffer: ArrayBuffer): { header: any; chunk: Uint8Array } {
  const view = new DataView(buffer);
  const headerLen = view.getUint32(0);
  const uint8 = new Uint8Array(buffer);
  const headerBytes = uint8.slice(4, 4 + headerLen);
  const decoder = new TextDecoder();
  const headerStr = decoder.decode(headerBytes);
  const header = JSON.parse(headerStr);
  const chunk = uint8.slice(4 + headerLen);
  return { header, chunk };
}

export class P2PTransport implements ITransport {
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private textCallbacks: ((data: any) => void)[] = [];
  private binaryCallbacks: ((data: { fileId: string; data: ArrayBuffer; meta?: any }) => void)[] = [];
  private openCallbacks: (() => void)[] = [];
  private closeCallbacks: (() => void)[] = [];
  private errorCallbacks: ((err: any) => void)[] = [];
  private qrGeneratedCallbacks: ((sdpData: string) => void)[] = [];
  private connected = false;
  private peerId: string;
  private signaling: QRSignaling;
  private incomingChunks: Map<string, { chunks: Map<number, Uint8Array>; total: number; meta?: any }> = new Map();

  constructor(peerId: string) {
    this.peerId = peerId;
    this.signaling = new QRSignaling();
  }

  private emitGeneratedSignal(description?: RTCSessionDescription | RTCSessionDescriptionInit): void {
    const localDescription = description || this.peerConnection?.localDescription;
    if (!localDescription) return;

    const normalizedDescription = localDescription instanceof RTCSessionDescription
      ? localDescription
      : new RTCSessionDescription(localDescription);

    const qrData = this.signaling.generateSignalData(normalizedDescription);
    console.log('[P2P] Сгенерирован офер:', qrData);
    this.qrGeneratedCallbacks.forEach(cb => cb(qrData));
  }

  private async initializePeerConnection(): Promise<void> {
    if (this.peerConnection) return;

    this.peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    this.peerConnection.ondatachannel = (event) => {
      this.dataChannel = event.channel;
      this.setupDataChannel();
    };

    this.peerConnection.onicecandidate = (event) => {
      if (event?.candidate) {
        const sdp = this.peerConnection?.localDescription;
        if (sdp) {
          this.emitGeneratedSignal(sdp);
        }
      } else if (this.peerConnection?.localDescription) {
        this.emitGeneratedSignal(this.peerConnection.localDescription);
      }
    };

    this.dataChannel = this.peerConnection.createDataChannel('strateg-channel');
    this.setupDataChannel();
  }

  async connect(): Promise<void> {
    await this.initializePeerConnection();
    if (!this.peerConnection) return;

    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);
    this.emitGeneratedSignal(offer);
  }

  private setupDataChannel(): void {
    if (!this.dataChannel) return;
    this.dataChannel.binaryType = 'arraybuffer';
    this.dataChannel.onopen = () => {
      this.connected = true;
      this.openCallbacks.forEach(cb => cb());
    };
    this.dataChannel.onclose = () => {
      this.connected = false;
      this.closeCallbacks.forEach(cb => cb());
    };
    this.dataChannel.onerror = (ev) => {
      this.errorCallbacks.forEach(cb => cb(ev));
    };
    this.dataChannel.onmessage = (event) => {
      try {
        if (typeof event.data === 'string') {
          const obj = JSON.parse(event.data);
          this.textCallbacks.forEach(cb => cb(obj));
          return;
        }

        // Binary message with header
        if (event.data instanceof ArrayBuffer) {
          const { header, chunk } = decodeHeaderAndChunk(event.data as ArrayBuffer);
          const fileId = header.fileId;
          const index = header.index;
          const total = header.total;
          const meta = header.meta;

          let entry = this.incomingChunks.get(fileId);
          if (!entry) {
            entry = { chunks: new Map(), total, meta };
            this.incomingChunks.set(fileId, entry);
          }
          entry.chunks.set(index, chunk);

          if (entry.chunks.size === total) {
            // assemble
            const parts: Uint8Array[] = [];
            for (let i = 0; i < total; i++) {
              const part = entry.chunks.get(i)!;
              parts.push(part);
            }
            const totalLen = parts.reduce((s, p) => s + p.byteLength, 0);
            const assembled = new Uint8Array(totalLen);
            let offset = 0;
            for (const p of parts) {
              assembled.set(p, offset);
              offset += p.byteLength;
            }
            this.incomingChunks.delete(fileId);
            this.binaryCallbacks.forEach(cb => cb({ fileId, data: assembled.buffer, meta }));
          }

          return;
        }
      } catch (e) {
        this.errorCallbacks.forEach(cb => cb(e));
      }
    };
  }

  // Метод для установки удалённого SDP (из QR-кода)
  async setRemoteSDP(sdpData: string): Promise<void> {
    const parsed = this.signaling.parseSignalData(sdpData);
    if (!parsed) return;

    await this.initializePeerConnection();
    if (!this.peerConnection) return;

    const { type, sdp } = parsed;
    const description = new RTCSessionDescription({ type: type as RTCSdpType, sdp });
    console.log('[P2P] Принимаем удалённый SDP:', type, sdp.slice(0, 120));
    await this.peerConnection.setRemoteDescription(description);

    if (type === 'offer') {
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      this.emitGeneratedSignal(answer);
    }
  }

  send(obj: any): void {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      try {
        const str = JSON.stringify(obj);
        this.dataChannel.send(str);
      } catch (err) {
        this.errorCallbacks.forEach(cb => cb(err));
      }
    } else {
      this.errorCallbacks.forEach(cb => cb(new Error('DataChannel not open')));
    }
  }

  // send ArrayBuffer with chunking
  sendBinary(arrayBuffer: ArrayBuffer, meta?: any): void {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      this.errorCallbacks.forEach(cb => cb(new Error('DataChannel not open')));
      return;
    }

    const total = Math.ceil(arrayBuffer.byteLength / CHUNK_SIZE);
    const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
    for (let i = 0; i < total; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, arrayBuffer.byteLength);
      const chunk = new Uint8Array(arrayBuffer.slice(start, end));
      const header = { fileId, index: i, total, meta };
      const packed = encodeHeaderAndChunk(header, chunk);
      try {
        this.dataChannel.send(packed);
      } catch (err) {
        this.errorCallbacks.forEach(cb => cb(err));
      }
    }
  }

  onMessage(callback: (data: any) => void): void {
    this.textCallbacks.push(callback);
  }

  onBinary(callback: (data: { fileId: string; data: ArrayBuffer; meta?: any }) => void): void {
    this.binaryCallbacks.push(callback);
  }

  onOpen(callback: () => void): void {
    this.openCallbacks.push(callback);
  }

  onClose(callback: () => void): void {
    this.closeCallbacks.push(callback);
  }

  // Compatibility with ITransport interface
  onConnect(callback: () => void): void {
    this.onOpen(callback);
  }

  onDisconnect(callback: () => void): void {
    this.onClose(callback);
  }

  onError(callback: (err: any) => void): void {
    this.errorCallbacks.push(callback);
  }

  onQRGenerated(callback: (sdpData: string) => void): () => void {
    this.qrGeneratedCallbacks.push(callback);
    return () => {
      this.qrGeneratedCallbacks = this.qrGeneratedCallbacks.filter(c => c !== callback);
    };
  }

  onBinaryGenerated?(): void {}

  isConnected(): boolean {
    return this.connected;
  }

  getPeerId(): string {
    return this.peerId;
  }

  disconnect(): void {
    if (this.dataChannel) {
      try {
        this.dataChannel.close();
      } catch {
        // ignore close errors during teardown
      }
      this.dataChannel = null;
    }
    if (this.peerConnection) {
      try {
        this.peerConnection.close();
      } catch {
        // ignore close errors during teardown
      }
      this.peerConnection = null;
    }
    this.connected = false;
  }
}

// Manager to hold multiple transports keyed by peerId
export class P2PManager {
  private transports: Map<string, P2PTransport> = new Map();
  private openCallbacks: ((peerId: string) => void)[] = [];
  private closeCallbacks: ((peerId: string) => void)[] = [];
  private messageCallbacks: ((peerId: string, data: any) => void)[] = [];
  private binaryCallbacks: ((peerId: string, payload: { fileId: string; data: ArrayBuffer; meta?: any }) => void)[] = [];
  private errorCallbacks: ((peerId: string, err: any) => void)[] = [];

  createTransport(peerId: string): P2PTransport {
    if (this.transports.has(peerId)) return this.transports.get(peerId)!;
    const t = new P2PTransport(peerId);
    t.onOpen(() => this.openCallbacks.forEach(cb => cb(peerId)));
    t.onClose(() => this.closeCallbacks.forEach(cb => cb(peerId)));
    t.onMessage((data) => this.messageCallbacks.forEach(cb => cb(peerId, data)));
    t.onBinary((payload) => this.binaryCallbacks.forEach(cb => cb(peerId, payload)));
    t.onError((err) => this.errorCallbacks.forEach(cb => cb(peerId, err)));
    this.transports.set(peerId, t);
    return t;
  }

  getTransport(peerId: string): P2PTransport | undefined {
    return this.transports.get(peerId);
  }

  async connectTo(peerId: string): Promise<P2PTransport> {
    const t = this.createTransport(peerId);
    await t.connect();
    return t;
  }

  sendBinaryTo(peerId: string, buffer: ArrayBuffer, meta?: any): void {
    const t = this.transports.get(peerId);
    if (!t) throw new Error('Transport not found');
    t.sendBinary(buffer, meta);
  }

  onOpen(cb: (peerId: string) => void) { this.openCallbacks.push(cb); }
  onClose(cb: (peerId: string) => void) { this.closeCallbacks.push(cb); }
  onMessage(cb: (peerId: string, data: any) => void) { this.messageCallbacks.push(cb); }
  onBinary(cb: (peerId: string, payload: { fileId: string; data: ArrayBuffer; meta?: any }) => void) { this.binaryCallbacks.push(cb); }
  onError(cb: (peerId: string, err: any) => void) { this.errorCallbacks.push(cb); }
}

// Export a singleton manager for app-wide usage
export const p2pManager = new P2PManager();

// High-level helpers for QR/offer flows
export async function createOfferFor(peerId?: string): Promise<string> {
  const id = peerId || `peer_${Date.now().toString(36).slice(-6)}`;
  const t = p2pManager.createTransport(id);
  return await new Promise<string>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Offer generation timeout')), 10000);
    const unsub = t.onQRGenerated ? t.onQRGenerated((sdpData: string) => {
      clearTimeout(timeout);
      if (typeof unsub === 'function') unsub();
      resolve(sdpData);
    }) : null;

    if (!unsub) {
      clearTimeout(timeout);
      reject(new Error('QR signal callback is unavailable'));
      return;
    }

    t.connect().catch((err: unknown) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

export async function acceptOffer(sdpData: string, peerId?: string): Promise<P2PTransport> {
  const id = peerId || `peer_${Date.now().toString(36).slice(-6)}`;
  const t = p2pManager.createTransport(id);
  await t.setRemoteSDP(sdpData);

  // In the browser the data channel may open asynchronously; resolve once the remote SDP is accepted
  // so the caller can continue the UI flow while WebRTC completes the actual connection handshake.
  return new Promise<P2PTransport>((resolve) => {
    const timeout = setTimeout(() => {
      resolve(t);
    }, 1000);

    const onOpen = () => {
      clearTimeout(timeout);
      resolve(t);
    };

    t.onOpen(onOpen);

    if (t.isConnected()) {
      clearTimeout(timeout);
      resolve(t);
    }
  });
}
