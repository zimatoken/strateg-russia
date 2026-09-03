import { vi } from 'vitest';

export const WebSocketReadyState = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
} as const;

type WebSocketListener = ((event: Event | MessageEvent | CloseEvent) => void) | null;

export class MockWebSocket {
  static instances: MockWebSocket[] = [];
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readonly sentMessages: string[] = [];
  url: string;
  readyState: number = WebSocketReadyState.CONNECTING;

  onopen: WebSocketListener = null;
  onmessage: WebSocketListener = null;
  onclose: WebSocketListener = null;
  onerror: WebSocketListener = null;

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  send(data: string): void {
    if (this.readyState !== WebSocketReadyState.OPEN) {
      throw new Error('WebSocket is not open');
    }
    this.sentMessages.push(data);
  }

  close(): void {
    if (this.readyState === WebSocketReadyState.CLOSED) return;
    this.readyState = WebSocketReadyState.CLOSED;
    this.onclose?.({} as CloseEvent);
  }

  simulateOpen(): void {
    this.readyState = WebSocketReadyState.OPEN;
    this.onopen?.({} as Event);
  }

  simulateMessage(data: unknown): void {
    this.onmessage?.({ data: JSON.stringify(data) } as MessageEvent);
  }

  simulateError(): void {
    this.onerror?.({} as Event);
  }

  simulateClose(): void {
    this.close();
  }

  static getLatest(): MockWebSocket {
    const latest = MockWebSocket.instances.at(-1);
    if (!latest) {
      throw new Error('No MockWebSocket instances created');
    }
    return latest;
  }
}

export function installMockWebSocket(): void {
  vi.stubGlobal('WebSocket', MockWebSocket);
}

export function resetMockWebSockets(): void {
  MockWebSocket.instances = [];
}
