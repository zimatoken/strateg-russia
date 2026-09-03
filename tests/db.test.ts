import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  __resetDbForTests,
  openDB,
  saveMessage,
  getMessages,
  getAllChats,
  markMessageDelivered,
  deleteOldMessages,
  updateChatMeta,
  MessageRecord,
} from '../src/core/db';

const makeMessage = (overrides: Partial<MessageRecord> = {}): MessageRecord => ({
  id: overrides.id ?? `msg-${Math.random().toString(36).slice(2)}`,
  chatId: overrides.chatId ?? 'ZIMA-CHATONE',
  text: overrides.text ?? 'hello',
  from: overrides.from ?? 'ZIMA-SENDERAA',
  to: overrides.to ?? 'ZIMA-CHATONE',
  timestamp: overrides.timestamp ?? Date.now(),
  isUser: overrides.isUser ?? false,
  delivered: overrides.delivered ?? false,
  ...overrides,
});

describe('db', () => {
  beforeEach(async () => {
    await __resetDbForTests();
    await openDB();
  });

  it('openDB creates stores', async () => {
    await expect(openDB()).resolves.toBeUndefined();
  });

  it('saveMessage persists message with delivered flag', async () => {
    const msg = makeMessage({ id: 'save-1', delivered: false });
    await saveMessage(msg);

    const messages = await getMessages('ZIMA-CHATONE');
    expect(messages).toHaveLength(1);
    expect(messages[0].delivered).toBe(false);
  });

  it('getMessages filters by chatId and sorts by timestamp', async () => {
    await saveMessage(makeMessage({ id: 'a', chatId: 'ZIMA-CHATAAA', timestamp: 200 }));
    await saveMessage(makeMessage({ id: 'b', chatId: 'ZIMA-CHATAAA', timestamp: 100 }));
    await saveMessage(makeMessage({ id: 'c', chatId: 'ZIMA-CHATBBB', timestamp: 50 }));

    const chatA = await getMessages('ZIMA-CHATAAA');
    expect(chatA.map(m => m.id)).toEqual(['b', 'a']);
  });

  it('getMessages respects limit', async () => {
    for (let i = 0; i < 5; i++) {
      await saveMessage(makeMessage({ id: `lim-${i}`, timestamp: i * 10 }));
    }
    const limited = await getMessages('ZIMA-CHATONE', 2);
    expect(limited).toHaveLength(2);
    expect(limited[0].id).toBe('lim-3');
    expect(limited[1].id).toBe('lim-4');
  });

  it('getAllChats returns chats sorted by lastTimestamp', async () => {
    await saveMessage(makeMessage({ chatId: 'ZIMA-CHAT111', timestamp: 100, text: 'one' }));
    await saveMessage(makeMessage({ chatId: 'ZIMA-CHAT222', timestamp: 300, text: 'two' }));

    const chats = await getAllChats();
    expect(chats).toHaveLength(2);
    expect(chats[0].chatId).toBe('ZIMA-CHAT222');
    expect(chats[1].chatId).toBe('ZIMA-CHAT111');
  });

  it('markMessageDelivered updates flag', async () => {
    await saveMessage(makeMessage({ id: 'del-1', delivered: false }));
    await markMessageDelivered('del-1');

    const messages = await getMessages('ZIMA-CHATONE');
    expect(messages[0].delivered).toBe(true);
  });

  it('deleteOldMessages removes messages older than maxAgeDays', async () => {
    const oldTs = Date.now() - 31 * 24 * 60 * 60 * 1000;
    const newTs = Date.now();

    await saveMessage(makeMessage({ id: 'old-1', timestamp: oldTs }));
    await saveMessage(makeMessage({ id: 'new-1', timestamp: newTs }));

    const deleted = await deleteOldMessages(30);
    expect(deleted).toBe(1);

    const remaining = await getMessages('ZIMA-CHATONE');
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe('new-1');
  });

  it('updateChatMeta merges chat metadata', async () => {
    await saveMessage(makeMessage({ chatId: 'ZIMA-METACHAT', text: 'hi' }));
    await updateChatMeta('ZIMA-METACHAT', { unreadCount: 0 });

    const chats = await getAllChats();
    const chat = chats.find(c => c.chatId === 'ZIMA-METACHAT');
    expect(chat?.unreadCount).toBe(0);
  });
});

describe('db fallback Map', () => {
  beforeEach(async () => {
    await __resetDbForTests();
    vi.stubGlobal('indexedDB', undefined);
    await openDB();
  });

  it('uses in-memory fallback when IndexedDB is unavailable', async () => {
    const msg = makeMessage({ id: 'fb-1' });
    await saveMessage(msg);

    const messages = await getMessages('ZIMA-CHATONE');
    expect(messages).toHaveLength(1);
    expect(messages[0].id).toBe('fb-1');
  });

  it('markMessageDelivered works in fallback mode', async () => {
    await saveMessage(makeMessage({ id: 'fb-del', delivered: false }));
    await markMessageDelivered('fb-del');

    const messages = await getMessages('ZIMA-CHATONE');
    expect(messages[0].delivered).toBe(true);
  });

  it('deleteOldMessages works in fallback mode', async () => {
    const oldTs = Date.now() - 40 * 24 * 60 * 60 * 1000;
    await saveMessage(makeMessage({ id: 'fb-old', timestamp: oldTs }));
    await saveMessage(makeMessage({ id: 'fb-new', timestamp: Date.now() }));

    const deleted = await deleteOldMessages(30);
    expect(deleted).toBe(1);
    expect((await getMessages('ZIMA-CHATONE')).map(m => m.id)).toEqual(['fb-new']);
  });
});
