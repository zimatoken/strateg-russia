// src/core/signaling.ts
// QR-сигалинг для обмена SDP между устройствами

export class QRSignaling {
  private peerId: string;

  constructor() {
    this.peerId = this.getPeerId();
  }

  // Генерация QR-данных (SDP + ICE)
  generateSignalData(description: RTCSessionDescription): string {
    const data = {
      type: description.type,
      sdp: description.sdp,
      peerId: this.peerId
    };
    return JSON.stringify(data);
  }

  // Парсинг QR-данных
  parseSignalData(qrData: string): { type: string; sdp: string; peerId: string } | null {
    try {
      return JSON.parse(qrData);
    } catch {
      return null;
    }
  }

  // Получение ID устройства (генерируется при первом запуске)
  private getPeerId(): string {
    if (typeof globalThis === 'undefined' || !('localStorage' in globalThis)) {
      return 'peer-' + Math.random().toString(36).substring(2, 10);
    }

    let id = globalThis.localStorage.getItem('strateg_peer_id');
    if (!id) {
      id = 'peer-' + Math.random().toString(36).substring(2, 10);
      globalThis.localStorage.setItem('strateg_peer_id', id);
    }
    return id;
  }

  // Показать QR-код (вызывается из UI)
  showQR(sdpData: string): void {
    console.log('[QR] Данные для QR-кода:', sdpData);
    // TODO: интегрировать с QRShare.tsx
  }
}
