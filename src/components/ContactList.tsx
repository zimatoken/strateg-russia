import { useEffect, useState } from 'react';
import { Avatar } from './Avatar';
import { getAllContacts, deleteContact, type Contact } from '../core/contact';
import EditContactModal from './EditContactModal';

interface ContactListProps {
  activeContactId?: string | null;
  onSelectContact: (id: string) => void;
  refreshKey?: number;
  unreadCounts?: Record<string, number>; // STAGE_B_3: Unread counts per contact
}

const formatTime = (timestamp?: number) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const isToday = date.toDateString() === today.toDateString();
  const isYesterday = date.toDateString() === yesterday.toDateString();
  if (isToday) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (isYesterday) return 'Вчера';
  return date.toLocaleDateString();
};

export default function ContactList({ activeContactId, onSelectContact, refreshKey = 0, unreadCounts = {} }: ContactListProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const all = await getAllContacts();
      setContacts(all);
    })();
  }, [refreshKey]);

  const handleEdit = (contact: Contact) => {
    setEditingContact(contact);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    await deleteContact(id);
    setDeleteConfirm(null);
    const all = await getAllContacts();
    setContacts(all);
  };

  const handleSave = async () => {
    const all = await getAllContacts();
    setContacts(all);
    setIsModalOpen(false);
    setEditingContact(null);
  };

  return (
    <>
      {contacts.length === 0 ? (
        <div className="empty-chat">
          <div className="empty-chat-icon">👥</div>
          <div className="empty-chat-text">Нажмите + чтобы добавить контакт</div>
        </div>
      ) : (
        <div className="contacts-list">
          {contacts.map((contact) => {
            // STAGE_A_7: Show "Нет сообщений" instead of empty preview
            const preview = contact.lastMessage ? contact.lastMessage.slice(0, 30) : 'Нет сообщений';
            const isActive = activeContactId === contact.id;
            const unreadCount = unreadCounts[contact.id] || 0; // STAGE_B_3: Get unread count
            const displayUnread = unreadCount > 99 ? '99+' : unreadCount.toString(); // STAGE_B_3: Format unread count
            return (
              <div
                key={contact.id}
                className={`contact-item ${isActive ? 'active' : ''}`}
              >
                <button
                  type="button"
                  onClick={() => onSelectContact(contact.id)}
                  className="contact-select"
                >
                  <div style={{ position: 'relative' }}>
                    <Avatar type={contact.avatar} size={40} color={contact.color} className="contact-avatar" />
                    {/* STAGE_B_3: Unread badge */}
                    {unreadCount > 0 && <span className="unread-badge">{displayUnread}</span>}
                  </div>
                  <div className="contact-info">
                    <div className="contact-name-row">
                      <div className="contact-name">{contact.name}</div>
                      <div className="contact-time">{formatTime(contact.lastMessageAt)}</div>
                    </div>
                    <div className="contact-preview">{preview}</div>
                  </div>
                </button>
                <div className="contact-actions">
                  <button
                    type="button"
                    onClick={() => handleEdit(contact)}
                    className="contact-action-btn"
                    title="Редактировать"
                  >
                    ✏️
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteConfirm(contact.id)}
                    className="contact-action-btn"
                    title="Удалить"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <EditContactModal
        contact={editingContact}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
      />

      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal-content" style={{ maxWidth: 320 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">Удалить контакт?</div>
            <p style={{ color: '#94a3b8', marginBottom: 20 }}>
              Контакты с ID {deleteConfirm} будут удалены без возможности восстановления.
            </p>
            <div className="modal-actions">
              <button type="button" className="modal-btn modal-btn-secondary" onClick={() => setDeleteConfirm(null)}>
                Отмена
              </button>
              <button
                type="button"
                className="modal-btn modal-btn-danger"
                onClick={() => handleDelete(deleteConfirm)}
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}

      <EditContactModal
        contact={editingContact}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
      />
    </>
  );
}
