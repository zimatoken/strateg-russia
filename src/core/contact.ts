import { openDB } from './db';

export interface Contact {
  id: string;
  name: string;
  avatar: string;
  color: string;
  addedAt: number;
  lastMessage?: string;
  lastMessageAt?: number;
}

export const AVATAR_LIBRARY = [
  'avatar-boy',
  'avatar-girl',
  'avatar-man',
  'avatar-woman',
  'avatar-grandma',
  'avatar-grandpa',
  'avatar-teen',
  'avatar-cat',
  'avatar-dog',
  'avatar-robot',
] as const;

export type AvatarType = (typeof AVATAR_LIBRARY)[number];

const CONTACTS_STORE = 'contacts';
export const fallbackContacts = new Map<string, Contact>();

export function __resetContactsForTests(): void {
  fallbackContacts.clear();
}

export function generateColorFromId(id: string): string {
  const colors = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6'];
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function normalizeContact(contact: Contact): Contact {
  const normalizedAvatar = AVATAR_LIBRARY.includes(contact.avatar as AvatarType) ? contact.avatar : 'avatar-robot';
  return {
    ...contact,
    id: contact.id.toUpperCase(),
    name: contact.name.trim() || contact.id,
    avatar: normalizedAvatar,
    color: contact.color || generateColorFromId(contact.id),
  };
}

async function getStore(): Promise<IDBDatabase | null> {
  try {
    await openDB();
    const dbModule = (await import('./db')) as typeof import('./db') & { getDBInstance?: () => IDBDatabase | null };
    return dbModule.getDBInstance?.() ?? null;
  } catch {
    return null;
  }
}

export async function addContact(contact: Contact): Promise<void> {
  const normalized = normalizeContact(contact);
  const db = await getStore();
  if (!db) {
    fallbackContacts.set(normalized.id, normalized);
    return;
  }

  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction([CONTACTS_STORE], 'readwrite');
    const store = transaction.objectStore(CONTACTS_STORE);
    store.put(normalized);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function getContact(id: string): Promise<Contact | null> {
  const db = await getStore();
  if (!db) {
    return fallbackContacts.get(id.toUpperCase()) ?? null;
  }

  return new Promise<Contact | null>((resolve, reject) => {
    const transaction = db.transaction([CONTACTS_STORE], 'readonly');
    const store = transaction.objectStore(CONTACTS_STORE);
    const request = store.get(id.toUpperCase());
    request.onsuccess = () => resolve(request.result ? normalizeContact(request.result as Contact) : null);
    request.onerror = () => reject(request.error);
  });
}

export async function getAllContacts(): Promise<Contact[]> {
  const db = await getStore();
  if (!db) {
    return Array.from(fallbackContacts.values()).map((contact) => normalizeContact(contact)).sort((a, b) => {
      const aTime = a.lastMessageAt ?? 0;
      const bTime = b.lastMessageAt ?? 0;
      if (bTime !== aTime) return bTime - aTime;
      return a.name.localeCompare(b.name);
    });
  }

  return new Promise<Contact[]>((resolve, reject) => {
    const transaction = db.transaction([CONTACTS_STORE], 'readonly');
    const store = transaction.objectStore(CONTACTS_STORE);
    const request = store.getAll();
    request.onsuccess = () => {
      const contacts = (request.result as Contact[]).map((contact) => normalizeContact(contact));
      contacts.sort((a, b) => {
        const aTime = a.lastMessageAt ?? 0;
        const bTime = b.lastMessageAt ?? 0;
        if (bTime !== aTime) return bTime - aTime;
        return a.name.localeCompare(b.name);
      });
      resolve(contacts);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function updateContact(id: string, updates: Partial<Contact>): Promise<void> {
  const existing = await getContact(id);
  if (!existing) {
    return;
  }
  const next = normalizeContact({ ...existing, ...updates, id: existing.id });
  await addContact(next);
}

export async function updateContactName(id: string, name: string): Promise<void> {
  await updateContact(id, { name });
}

export async function updateContactAvatar(id: string, avatar: string): Promise<void> {
  await updateContact(id, { avatar });
}

export async function deleteContact(id: string): Promise<void> {
  const db = await getStore();
  if (!db) {
    fallbackContacts.delete(id.toUpperCase());
    return;
  }

  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction([CONTACTS_STORE], 'readwrite');
    const store = transaction.objectStore(CONTACTS_STORE);
    store.delete(id.toUpperCase());
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function getOrCreateContact(id: string): Promise<Contact> {
  const existing = await getContact(id);
  if (existing) {
    return existing;
  }
  const contact: Contact = {
    id: id.toUpperCase(),
    name: id.toUpperCase(),
    avatar: 'avatar-robot',
    color: generateColorFromId(id),
    addedAt: Date.now(),
  };
  await addContact(contact);
  return contact;
}
