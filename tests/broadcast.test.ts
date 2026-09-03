import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  __resetBroadcastForTests,
  initBroadcast,
  sendBroadcast,
  onBroadcast,
  getTabId,
  closeBroadcast,
  BroadcastMessage,
} from '../src/core/broadcast';

class MockBroadcastChannel {
  static channels = new Map<string, Set<(event: MessageEvent) => void>>();
  name: string;

  constructor(name: string) {
    this.name = name;
    if (!MockBroadcastChannel.channels.has(name)) {
      MockBroadcastChannel.channels.set(name, new Set());
    }
  }

  postMessage(data: unknown): void {
    MockBroadcastChannel.channels.get(this.name)?.forEach(listener => {
      listener({ data } as MessageEvent);
    });
  }

  addEventListener(type: string, handler: (event: MessageEvent) => void): void {
    if (type === 'message') {
      MockBroadcastChannel.channels.get(this.name)?.add(handler);
    }
  }

  removeEventListener(type: string, handler: (event: MessageEvent) => void): void {
    if (type === 'message') {
      MockBroadcastChannel.channels.get(this.name)?.delete(handler);
    }
  }

  close(): void {
    MockBroadcastChannel.channels.delete(this.name);
  }

  static reset(): void {
    MockBroadcastChannel.channels.clear();
  }
}

describe('broadcast', () => {
  beforeEach(() => {
    __resetBroadcastForTests();
    MockBroadcastChannel.reset();
    vi.stubGlobal('BroadcastChannel', MockBroadcastChannel);
  });

  it('initBroadcast creates channel and tabId', () => {
    const channel = initBroadcast('test-channel');
    expect(channel).toBeInstanceOf(MockBroadcastChannel);
    expect(getTabId()).toMatch(/^tab_/);
  });

  it('sendBroadcast delivers message to other tab listeners', () => {
    initBroadcast('sync-a');
    const tab1Id = getTabId();

    const received: BroadcastMessage[] = [];
    onBroadcast(msg => received.push(msg));

    const remote = new MockBroadcastChannel('sync-a');
    remote.postMessage({
      type: 'NEW_MESSAGE',
      payload: { text: 'hi' },
      timestamp: Date.now(),
      tabId: 'tab_remote_other',
    });

    expect(received).toHaveLength(1);
    expect(received[0].type).toBe('NEW_MESSAGE');
    expect(received[0].payload.text).toBe('hi');
    expect(received[0].tabId).not.toBe(tab1Id);
  });

  it('ignores messages from same tabId', () => {
    initBroadcast('sync-self');
    const ownTabId = getTabId();

    const received: BroadcastMessage[] = [];
    onBroadcast(msg => received.push(msg));

    sendBroadcast('CHAT_SWITCH', { chatId: 'STRATEG-SELFTEST' });

    expect(received).toHaveLength(0);
    expect(ownTabId).toBeTruthy();
  });

  it('onBroadcast unsubscribe stops receiving', () => {
    initBroadcast('sync-unsub');
    const received: BroadcastMessage[] = [];
    const unsubscribe = onBroadcast(msg => received.push(msg));

    unsubscribe();

    initBroadcast('sync-unsub');
    sendBroadcast('ID_CHANGED', { strategId: 'STRATEG-NEWIDNEW' });

    expect(received).toHaveLength(0);
  });

  it('closeBroadcast clears listeners', () => {
    initBroadcast('sync-close');
    const received: BroadcastMessage[] = [];
    onBroadcast(msg => received.push(msg));
    closeBroadcast();

    initBroadcast('sync-close');
    sendBroadcast('NEW_MESSAGE', { text: 'after-close' });

    expect(received).toHaveLength(0);
  });
});

describe('broadcast localStorage fallback', () => {
  beforeEach(() => {
    __resetBroadcastForTests();
    vi.stubGlobal('BroadcastChannel', undefined);
  });

  it('uses localStorage when BroadcastChannel is unavailable', () => {
    initBroadcast('strateg-russia-sync');

    sendBroadcast('NEW_MESSAGE', { text: 'via-storage' });

    const stored = localStorage.getItem('strateg-russia-sync');
    expect(stored).toBeTruthy();
    expect(JSON.parse(stored!).payload.text).toBe('via-storage');
  });

  it('storage fallback ignores own tabId messages', () => {
    initBroadcast('strateg-fallback');
    const ownTab = getTabId();
    const received: BroadcastMessage[] = [];
    onBroadcast(msg => received.push(msg));

    const ownMsg: BroadcastMessage = {
      type: 'NEW_MESSAGE',
      payload: { text: 'own' },
      timestamp: Date.now(),
      tabId: ownTab,
    };

    window.dispatchEvent(
      new StorageEvent('storage', {
        key: 'strateg-fallback',
        newValue: JSON.stringify(ownMsg),
      })
    );

    expect(received).toHaveLength(0);
  });
});
