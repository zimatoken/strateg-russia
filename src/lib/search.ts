// STAGE7: Global search logic for contacts, groups, and messages

import { getAllContacts } from '../core/contact';
import { loadGroups } from '../core/groupChat';

export interface SearchResult {
  type: 'contact' | 'group' | 'message';
  id: string;
  title: string;
  subtitle?: string;
  avatar?: string;
  timestamp?: number;
  contactId?: string; // for messages - which chat it belongs to
}

/**
 * Search all data: contacts, groups, messages
 */
export async function searchAll(query: string): Promise<SearchResult[]> {
  const trimmedQuery = query.trim().toLowerCase();
  if (!trimmedQuery) return [];

  const results: SearchResult[] = [];

  // Search contacts
  const contacts = await getAllContacts();
  const matchingContacts = contacts.filter(
    c => c.name.toLowerCase().includes(trimmedQuery) || c.id.toLowerCase().includes(trimmedQuery)
  );
  for (const contact of matchingContacts.slice(0, 5)) {
    results.push({
      type: 'contact',
      id: contact.id,
      title: contact.name,
      subtitle: contact.id,
      avatar: contact.avatar,
    });
  }

  // Search groups
  const groups = await loadGroups();
  const matchingGroups = groups.filter(
    g => g.name.toLowerCase().includes(trimmedQuery) || g.id.toLowerCase().includes(trimmedQuery)
  );
  for (const group of matchingGroups.slice(0, 5)) {
    results.push({
      type: 'group',
      id: group.id,
      title: group.name,
      subtitle: `${group.members.length} участников`,
      avatar: group.avatarId,
    });
  }

  // Search messages - need to check all message stores
  // Messages are stored in IndexedDB with chatId, so we need to search across all chats
  const allMessages = await getAllMessages();
  const matchingMessages = allMessages.filter(
    m => m.text && m.text.toLowerCase().includes(trimmedQuery)
  );
  for (const msg of matchingMessages.slice(0, 5)) {
    results.push({
      type: 'message',
      id: msg.id,
      title: msg.from === msg.to ? 'Вы' : msg.from,
      subtitle: msg.text?.slice(0, 50) + (msg.text && msg.text.length > 50 ? '...' : ''),
      timestamp: msg.timestamp,
      contactId: msg.chatId,
    });
  }

  return results;
}

/**
 * Get all messages from IndexedDB across all chats
 */
async function getAllMessages(): Promise<Array<{ id: string; chatId: string; text: string; from: string; to: string; timestamp: number }>> {
  // This is a helper to get all messages for search
  // We'll need to query the messages store without a specific chatId
  const allMessages: Array<{ id: string; chatId: string; text: string; from: string; to: string; timestamp: number }> = [];

  try {
    const dbModule = await import('../core/db');
    const { getDBInstance } = dbModule as typeof import('../core/db') & { getDBInstance?: () => IDBDatabase | null };
    const db = getDBInstance?.();

    if (!db) {
      // Fallback: return empty array
      return allMessages;
    }

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['messages'], 'readonly');
      const store = transaction.objectStore('messages');
      const request = store.getAll();

      request.onsuccess = () => {
        const records = request.result as Array<{
          id: string;
          chatId: string;
          text: string;
          from: string;
          to: string;
          timestamp: number;
        }>;
        resolve(records);
      };

      request.onerror = () => reject(request.error);
    });
  } catch {
    return allMessages;
  }
}
