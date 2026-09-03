// src/core/p2p.ts
// WebRTC-реализация ITransport с QR-сигналингом

import { ITransport } from './transport';
import { QRSignaling } from './signaling';

export class P2PTransport implements ITransport {
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private messageCallbacks: ((data: any) => void)[] = [];
  private connectCallbacks: (() => void)[] = [];
  private disconnectCallbacks: (() => void)[] = [];
  private qrGeneratedCallbacks: ((sdpData: string) => void)[] = [];
  private connected = false;
  private peerId: string;
  private signaling: QRSignaling;

  constructor(peerId: string) {
    this.peerId = peerId;
    this.signaling = new QRSignaling();
  }

  async connect(): Promise<void> {
    this.peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    this.dataChannel = this.peerConnection.createDataChannel('strateg-channel');
    this.setupDataChannel();

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        // QR-код будет показан через signaling
        const sdp = this.peerConnection?.localDescription;
        if (sdp) {
          const qrData = this.signaling.generateSignalData(sdp);
          console.log('[P2P] QR-данные для обмена:', qrData);
          this.qrGeneratedCallbacks.forEach(cb => cb(qrData));
        }
      }
    };

    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);

    // Ждём ответ через QR
    console.log('[P2P] Ожидание SDP-ответа через QR...');
  }

  private setupDataChannel(): void {
    if (!this.dataChannel) return;
    this.dataChannel.onopen = () => {
      this.connected = true;
      this.connectCallbacks.forEach(cb => cb());
      console.log('[P2P] DataChannel открыт');
    };
    this.dataChannel.onclose = () => {
      this.connected = false;
      this.disconnectCallbacks.forEach(cb => cb());
      console.log('[P2P] DataChannel закрыт');
    };
    this.dataChannel.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.messageCallbacks.forEach(cb => cb(data));
      } catch (e) {
        console.warn('[P2P] Невалидный JSON:', event.data);
      }
    };
  }

  // Метод для установки удалённого SDP (из QR-кода)
  async setRemoteSDP(sdpData: string): Promise<void> {
    const parsed = this.signaling.parseSignalData(sdpData);
    if (!parsed || !this.peerConnection) return;

    const { type, sdp } = parsed;
    const description = new RTCSessionDescription({ type: type as RTCSdpType, sdp });
    await this.peerConnection.setRemoteDescription(description);

    if (type === 'offer') {
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      // Показываем QR с ответом
      const localDesc = this.peerConnection.localDescription;
      if (localDesc) {
        const qrData = this.signaling.generateSignalData(localDesc);
        console.log('[P2P] QR-ответ для обмена:', qrData);
        this.qrGeneratedCallbacks.forEach(cb => cb(qrData));
      }
    }
  }

  send(data: any): void {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      this.dataChannel.send(JSON.stringify(data));
    } else {
      console.warn('[P2P] DataChannel не готов для отправки');
    }
  }

  onMessage(callback: (data: any) => void): void {
    this.messageCallbacks.push(callback);
  }

  onConnect(callback: () => void): void {
    this.connectCallbacks.push(callback);
  }

  onDisconnect(callback: () => void): void {
    this.disconnectCallbacks.push(callback);
  }

  onQRGenerated(callback: (sdpData: string) => void): void {
    this.qrGeneratedCallbacks.push(callback);
  }

  isConnected(): boolean {
    return this.connected;
  }

  getPeerId(): string {
    return this.peerId;
  }

  disconnect(): void {
    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    this.connected = false;
  }
}
