import { beforeEach, describe, expect, it } from 'vitest';
import { __resetDbForTests } from '../src/core/db';
import {
  addContact,
  generateColorFromId,
  getAllContacts,
  getContact,
  getOrCreateContact,
  updateContact,
} from '../src/core/contact';

describe('contacts', () => {
  beforeEach(async () => {
    await __resetDbForTests();
  });

  it('adds and reads a contact', async () => {
    await addContact({
      id: 'ZIMA-TEST001',
      name: 'Мама',
      avatar: 'avatar-mom',
      color: '#3b82f6',
      addedAt: 1,
      lastMessage: 'Привет',
      lastMessageAt: 2,
    });

    const contact = await getContact('ZIMA-TEST001');
    expect(contact?.name).toBe('Мама');
    expect(contact?.lastMessage).toBe('Привет');
  });

  it('returns all contacts sorted by lastMessageAt desc and name', async () => {
    await addContact({ id: 'СТРАТЕГ-B', name: 'Брат', avatar: 'avatar-boy', color: '#ef4444', addedAt: 1, lastMessageAt: 10 });
    await addContact({ id: 'СТРАТЕГ-A', name: 'Аня', avatar: 'avatar-girl', color: '#22c55e', addedAt: 2, lastMessageAt: 20 });

    const contacts = await getAllContacts();
    expect(contacts.map((item) => item.id)).toEqual(['СТРАТЕГ-A', 'СТРАТЕГ-B']);
  });

  it('updates contact fields', async () => {
    await addContact({ id: 'СТРАТЕГ-UPD', name: 'Тест', avatar: 'avatar-robot', color: '#111111', addedAt: 1 });
    await updateContact('СТРАТЕГ-UPD', { name: 'Новый', lastMessage: 'Обновлено' });

    const contact = await getContact('СТРАТЕГ-UPD');
    expect(contact?.name).toBe('Новый');
    expect(contact?.lastMessage).toBe('Обновлено');
  });

  it('generates deterministic color from id', () => {
    expect(generateColorFromId('СТРАТЕГ-ONE')).toBe(generateColorFromId('СТРАТЕГ-ONE'));
    expect(generateColorFromId('СТРАТЕГ-ONE')).not.toBe(generateColorFromId('СТРАТЕГ-TWO'));
  });

  it('creates a contact when missing', async () => {
    const created = await getOrCreateContact('СТРАТЕГ-NEW');
    expect(created.name).toBe('СТРАТЕГ-NEW');
    expect(created.avatar).toBe('avatar-robot');

    const stored = await getContact('СТРАТЕГ-NEW');
    expect(stored?.id).toBe('СТРАТЕГ-NEW');
  });
});
