// BroadcastChannel модуль для синхронизации между вкладками

export interface BroadcastMessage {
  type: 'NEW_MESSAGE' | 'MESSAGE_READ' | 'MESSAGE_DELETED' | 'ID_CHANGED' | 'CHAT_SWITCH' | 'CHAT_CLEARED' | 'TYPING_START' | 'TYPING_STOP';
  payload: any;
  timestamp: number;
  tabId: string;
}

let channel: BroadcastChannel | null = null;
let channelName = 'strateg-russia-sync';
let tabId: string;
let listeners: ((msg: BroadcastMessage) => void)[] = [];
let isInitialized = false;

// Генерация уникального tabId
function generateTabId(): string {
  return `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function initBroadcast(name: string = 'strateg-russia-sync'): BroadcastChannel | null {
  channelName = name;
  tabId = tabId || generateTabId();
  isInitialized = true;

  // Проверка поддержки BroadcastChannel
  if (typeof BroadcastChannel === 'undefined') {
    console.warn('BroadcastChannel not supported, using localStorage fallback');
    initLocalStorageFallback(name);
    return null;
  }

  try {
    channel = new BroadcastChannel(name);
    console.log('📡 BroadcastChannel initialized:', tabId);
    return channel;
  } catch {
    console.warn('BroadcastChannel creation failed, using localStorage fallback');
    initLocalStorageFallback(name);
    return null;
  }
}

// Fallback через localStorage + storage event
function initLocalStorageFallback(channelName: string): void {
  const target = globalThis as typeof globalThis & { addEventListener?: (type: string, listener: (event: StorageEvent) => void) => void };
  if (typeof target.addEventListener !== 'function') {
    return;
  }

  target.addEventListener('storage', (event: StorageEvent) => {
    if (event.key === channelName && event.newValue) {
      try {
        const msg = JSON.parse(event.newValue) as BroadcastMessage;
        if (msg.tabId !== tabId) {
          notifyListeners(msg);
        }
      } catch (error) {
        console.error('Error parsing broadcast message:', error);
      }
    }
  });
}

function notifyListeners(msg: BroadcastMessage): void {
  listeners.forEach(listener => {
    try {
      listener(msg);
    } catch (error) {
      console.error('Error in broadcast listener:', error);
    }
  });
}

export function sendBroadcast(type: string, payload: any): void {
  if (!tabId) {
    tabId = generateTabId();
  }

  const msg: BroadcastMessage = {
    type: type as BroadcastMessage['type'],
    payload,
    timestamp: Date.now(),
    tabId
  };

  if (channel) {
    channel.postMessage(msg);
  } else {
    // Fallback через localStorage
    const storage = globalThis.localStorage;
    if (storage) {
      storage.setItem(channelName, JSON.stringify(msg));
    }
  }
}

export function onBroadcast(callback: (msg: BroadcastMessage) => void): () => void {
  if (!isInitialized) {
    // Если broadcast не инициализирован, просто добавляем в listeners
    listeners.push(callback);
    return () => {
      listeners = listeners.filter(l => l !== callback);
    };
  }

  if (channel) {
    const handler = (event: MessageEvent) => {
      const msg = event.data as BroadcastMessage;
      if (msg.tabId !== tabId) {
        callback(msg);
      }
    };
    channel.addEventListener('message', handler);
    listeners.push(callback);

    return () => {
      if (channel) {
        channel.removeEventListener('message', handler);
      }
      listeners = listeners.filter(l => l !== callback);
    };
  } else {
    // Fallback уже добавлен в initLocalStorageFallback
    listeners.push(callback);
    return () => {
      listeners = listeners.filter(l => l !== callback);
    };
  }
}

export function getTabId(): string {
  return tabId;
}

export function closeBroadcast(): void {
  if (channel) {
    channel.close();
    channel = null;
  }
  listeners = [];
  isInitialized = false;
}

/** @internal Сброс состояния модуля (только для unit-тестов) */
export function __resetBroadcastForTests(): void {
  closeBroadcast();
  channelName = 'strateg-russia-sync';
  tabId = '';
}
