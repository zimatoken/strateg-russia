// src/core/transport.ts
// Интерфейс транспорта для P2P-связи

export interface ITransport {
  connect(): Promise<void>;
  disconnect(): void;
  send(data: any): void;
  onMessage(callback: (data: any) => void): void;
  onConnect(callback: () => void): void;
  onDisconnect(callback: () => void): void;
  isConnected(): boolean;
  getPeerId(): string;
}
