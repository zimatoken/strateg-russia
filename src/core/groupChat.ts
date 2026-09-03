// src/core/groupChat.ts
// Group chat management
import { sendBroadcast } from './broadcast';
import { saveGroupChat, getGroupChats, getGroupChat, deleteGroupChat, saveGroupMessage, getGroupMessages, updateGroupChat } from './db';
import { getDialogCore } from './dialogCore';

export interface GroupChat {
  id: string; // ROOM-XXX
  name: string;
  creatorId: string;
  members: string[];
  avatarId: string; // STAGE6: group avatar
  createdAt: number;
}

export interface GroupMessage {
  type: 'GROUP_MESSAGE';
  id: string;
  roomId: string;
  senderId: string;
  text?: string;
  files?: FileAttachment[];
  timestamp: number;
}

export interface FileAttachment {
  name: string;
  type: string;
  size: number;
  data: string;
}

function isSocketOpen(ws: WebSocket | null | undefined): boolean {
  // STAGE6: fix TypeScript error - use numeric constant
  return Boolean(ws && ws.readyState === 1);
}

/**
 * Generate a unique room ID
 */
function generateRoomId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'ROOM-';
  for (let i = 0; i < 9; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Create a new group chat
 */
export async function createGroup(name: string, members: string[], avatarId: string = 'avatar-robot'): Promise<GroupChat> {
  const core = getDialogCore();
  const myId = core.getConnectionState().currentStrategId;

  if (!myId) {
    throw new Error('Not connected');
  }

  // Ensure creator is in members
  if (!members.includes(myId)) {
    members.push(myId);
  }

  const group: GroupChat = {
    id: generateRoomId(),
    name,
    creatorId: myId,
    members,
    avatarId, // STAGE6: include avatar
    createdAt: Date.now()
  };

  await saveGroupChat(group);

  if (core.getConnectionState().isConnected) {
    const ws = (core as any).ws;
    if (isSocketOpen(ws)) {
      ws.send(JSON.stringify({
        type: 'GROUP_CREATE',
        roomId: group.id,
        name: group.name,
        creatorId: group.creatorId,
        members: group.members,
        avatarId: group.avatarId // STAGE6: include avatar in broadcast
      }));
    }
  }

  // Broadcast to other tabs
  sendBroadcast('GROUP_UPDATE', { roomId: group.id, action: 'create' });

  return group;
}

/**
 * Join an existing group
 */
export async function joinGroup(roomId: string): Promise<boolean> {
  const core = getDialogCore();
  const myId = core.getConnectionState().currentStrategId;
  
  if (!myId) {
    return false;
  }

  const group = await getGroupChat(roomId);
  if (!group) {
    return false;
  }

  if (group.members.includes(myId)) {
    return true; // Already a member
  }

  group.members.push(myId);
  await updateGroupChat(roomId, { members: group.members });

  // Send GROUP_JOIN message to coordinator
  if (core.getConnectionState().isConnected) {
    const ws = (core as any).ws;
    if (isSocketOpen(ws)) {
      ws.send(JSON.stringify({
        type: 'GROUP_JOIN',
        roomId,
        userId: myId
      }));
    }
  }

  // Broadcast to other tabs
  sendBroadcast('GROUP_UPDATE', { roomId, action: 'join' });

  return true;
}

/**
 * Leave a group
 */
export async function leaveGroup(roomId: string): Promise<void> {
  const core = getDialogCore();
  const myId = core.getConnectionState().currentStrategId;
  
  if (!myId) {
    return;
  }

  const group = await getGroupChat(roomId);
  if (!group) {
    return;
  }

  group.members = group.members.filter(m => m !== myId);
  
  if (group.members.length === 0) {
    // Delete group if no members left
    await deleteGroupChat(roomId);
  } else {
    await updateGroupChat(roomId, { members: group.members });
  }

  // Send GROUP_LEAVE message to coordinator
  if (core.getConnectionState().isConnected) {
    const ws = (core as any).ws;
    if (isSocketOpen(ws)) {
      ws.send(JSON.stringify({
        type: 'GROUP_LEAVE',
        roomId,
        userId: myId
      }));
    }
  }

  // Broadcast to other tabs
  sendBroadcast('GROUP_UPDATE', { roomId, action: 'leave' });
}

/**
 * Get group members
 */
export async function getGroupMembers(roomId: string): Promise<string[]> {
  const group = await getGroupChat(roomId);
  return group?.members || [];
}

/**
 * Check if user is group admin (creator)
 */
export async function isGroupAdmin(roomId: string, userId: string): Promise<boolean> {
  const group = await getGroupChat(roomId);
  return group?.creatorId === userId;
}

/**
 * Send a message to a group
 */
export async function sendGroupMessage(roomId: string, text: string, files?: File[]): Promise<boolean> {
  const core = getDialogCore();
  const myId = core.getConnectionState().currentStrategId;
  
  if (!myId || !core.getConnectionState().isConnected) {
    return false;
  }

  const group = await getGroupChat(roomId);
  if (!group) {
    return false;
  }

  if (!group.members.includes(myId)) {
    return false;
  }

  // Convert files to base64 if provided
  let fileAttachments: FileAttachment[] | undefined;
  if (files && files.length > 0) {
    fileAttachments = await Promise.all(
      files.map(async (file) => {
        const data = await fileToBase64(file);
        return {
          name: file.name,
          type: file.type,
          size: file.size,
          data
        };
      })
    );
  }

  const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const message: GroupMessage = {
    type: 'GROUP_MESSAGE',
    id: messageId,
    roomId,
    senderId: myId,
    text,
    files: fileAttachments,
    timestamp: Date.now()
  };

  // Save to IndexedDB
  await saveGroupMessage({
    id: message.id,
    roomId: message.roomId,
    senderId: message.senderId,
    text: message.text,
    files: message.files ? JSON.stringify(message.files) : undefined,
    timestamp: message.timestamp
  });

  // Send via WebSocket
  const ws = (core as any).ws;
  if (isSocketOpen(ws)) {
    ws.send(JSON.stringify({
      ...message,
      type: 'GROUP_MESSAGE'
    }));
  }

  return true;
}

/**
 * Load group messages
 */
export async function loadGroupMessages(roomId: string): Promise<GroupMessage[]> {
  const records = await getGroupMessages(roomId);
  return records.map(record => ({
    type: 'GROUP_MESSAGE' as const,
    id: record.id,
    roomId: record.roomId,
    senderId: record.senderId,
    text: record.text,
    files: record.files ? JSON.parse(record.files) : undefined,
    timestamp: record.timestamp
  }));
}

/**
 * Load all groups
 */
export async function loadGroups(): Promise<GroupChat[]> {
  const records = await getGroupChats();
  // STAGE6: handle migration - add default avatarId if missing
  return records.map(record => ({
    ...record,
    avatarId: record.avatarId || 'avatar-robot'
  }));
}

/**
 * Helper: Convert file to base64
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]); // Remove data URL prefix
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
