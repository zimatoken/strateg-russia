import 'fake-indexeddb/auto';
import { beforeEach, vi } from 'vitest';
import { installMockWebSocket, resetMockWebSockets } from './mocks/ws';

class MockDataChannel {
  binaryType = 'arraybuffer';
  readyState = 'open';
  send = vi.fn();
  close = vi.fn();
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onmessage: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
}

class MockPeerConnection {
  localDescription: any = null;
  onicecandidate: ((event: any) => void) | null = null;
  ondatachannel: ((event: any) => void) | null = null;
  dataChannel: MockDataChannel | null = null;

  createDataChannel = vi.fn(() => {
    this.dataChannel = new MockDataChannel();
    return this.dataChannel;
  });

  createOffer = vi.fn(async () => ({ type: 'offer', sdp: 'mock-offer-sdp' }));
  createAnswer = vi.fn(async () => ({ type: 'answer', sdp: 'mock-answer-sdp' }));
  setLocalDescription = vi.fn(async (description: any) => {
    this.localDescription = description;
  });
  setRemoteDescription = vi.fn(async () => undefined);
  close = vi.fn();
}

Object.defineProperty(globalThis, 'RTCPeerConnection', {
  value: MockPeerConnection,
  writable: true,
});

Object.defineProperty(globalThis, 'RTCSessionDescription', {
  value: class {
    constructor(public init: any) {
      Object.assign(this, init);
    }
  },
  writable: true,
});

const localStorageStore = new Map<string, string>();

const localStorageMock: Storage = {
  get length() {
    return localStorageStore.size;
  },
  clear() {
    localStorageStore.clear();
  },
  getItem(key: string) {
    return localStorageStore.get(key) ?? null;
  },
  setItem(key: string, value: string) {
    localStorageStore.set(key, String(value));
  },
  removeItem(key: string) {
    localStorageStore.delete(key);
  },
  key(index: number) {
    return Array.from(localStorageStore.keys())[index] ?? null;
  },
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

Object.defineProperty(window, 'location', {
  value: {
    href: 'http://localhost:5173/',
    origin: 'http://localhost:5173',
    pathname: '/',
    search: '',
    replaceState: vi.fn(),
  },
  writable: true,
});

Object.defineProperty(window, 'history', {
  value: {
    replaceState: vi.fn(),
  },
  writable: true,
});

Object.defineProperty(navigator, 'serviceWorker', {
  value: {
    register: vi.fn().mockResolvedValue({ scope: '/' }),
  },
  writable: true,
});

installMockWebSocket();

beforeEach(() => {
  localStorageStore.clear();
  resetMockWebSockets();
  vi.clearAllMocks();
});
