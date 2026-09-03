import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockSendBroadcast, mockSaveGroupChat, mockGetGroupChat, mockUpdateGroupChat, mockDeleteGroupChat, mockSaveGroupMessage, mockGetGroupMessages, mockGetGroupChats, mockCore } = vi.hoisted(() => ({
  mockSendBroadcast: vi.fn(),
  mockSaveGroupChat: vi.fn(),
  mockGetGroupChat: vi.fn(),
  mockUpdateGroupChat: vi.fn(),
  mockDeleteGroupChat: vi.fn(),
  mockSaveGroupMessage: vi.fn(),
  mockGetGroupMessages: vi.fn(),
  mockGetGroupChats: vi.fn(),
  mockCore: {
    getConnectionState: vi.fn(() => ({
      currentZimaId: 'ZIMA-TESTUSER1',
      isConnected: true,
    })),
  },
}));

vi.mock('../src/core/broadcast', () => ({
  sendBroadcast: mockSendBroadcast,
}));

vi.mock('../src/core/dialogCore', () => ({
  getDialogCore: () => mockCore,
}));

vi.mock('../src/core/db', () => ({
  saveGroupChat: mockSaveGroupChat,
  getGroupChat: mockGetGroupChat,
  updateGroupChat: mockUpdateGroupChat,
  deleteGroupChat: mockDeleteGroupChat,
  saveGroupMessage: mockSaveGroupMessage,
  getGroupMessages: mockGetGroupMessages,
  getGroupChats: mockGetGroupChats,
}));

import { createGroup, joinGroup, leaveGroup, sendGroupMessage } from '../src/core/groupChat';

describe('group chat flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockSaveGroupChat.mockResolvedValue(undefined);
    mockGetGroupChat.mockResolvedValue(null);
    mockUpdateGroupChat.mockImplementation(async (_roomId: string, updates: any) => {
      const current = mockGetGroupChat.mock.results.at(-1)?.value;
      if (current && typeof current.then !== 'function') {
        Object.assign(current, updates);
      }
    });
    mockDeleteGroupChat.mockResolvedValue(undefined);
    mockSaveGroupMessage.mockResolvedValue(undefined);
    mockGetGroupMessages.mockResolvedValue([]);
    mockGetGroupChats.mockResolvedValue([]);
  });

  it('creates a group and notifies coordinator', async () => {
    const ws = {
      readyState: 1,
      send: vi.fn(),
    } as unknown as WebSocket;

    (mockCore.getConnectionState as any).mockReturnValue({
      currentZimaId: 'ZIMA-TESTUSER1',
      isConnected: true,
    });

    (mockCore as any).ws = ws;

    const group = await createGroup('Team', ['ZIMA-TESTUSER2']);

    expect(group.name).toBe('Team');
    expect(group.members).toContain('ZIMA-TESTUSER1');
    expect(mockSaveGroupChat).toHaveBeenCalled();
    expect(ws.send).toHaveBeenCalledWith(expect.stringContaining('"type":"GROUP_CREATE"'));
    expect(mockSendBroadcast).toHaveBeenCalled();
  });

  it('joins and leaves a group and sends group messages', async () => {
    const ws = {
      readyState: 1,
      send: vi.fn(),
    } as unknown as WebSocket;

    (mockCore as any).ws = ws;
    const group = {
      id: 'ROOM-TEST',
      name: 'Team',
      creatorId: 'ZIMA-TESTUSER1',
      members: ['СТРАТЕГ-OTHER'],
      createdAt: Date.now(),
    };

    mockGetGroupChat.mockImplementation(async () => group);
    mockUpdateGroupChat.mockImplementation(async (_roomId: string, updates: any) => {
      Object.assign(group, updates);
    });

    await joinGroup('ROOM-TEST');
    expect(ws.send).toHaveBeenCalledWith(expect.stringContaining('"type":"GROUP_JOIN"'));

    await sendGroupMessage('ROOM-TEST', 'hello');
    expect(mockSaveGroupMessage).toHaveBeenCalled();
    expect(ws.send).toHaveBeenCalledWith(expect.stringContaining('"type":"GROUP_MESSAGE"'));

    await leaveGroup('ROOM-TEST');
    expect(ws.send).toHaveBeenCalledWith(expect.stringContaining('"type":"GROUP_LEAVE"'));
  });
});
