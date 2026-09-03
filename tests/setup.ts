import 'fake-indexeddb/auto';
import { beforeEach, vi } from 'vitest';
import { installMockWebSocket, resetMockWebSockets } from './mocks/ws';

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
