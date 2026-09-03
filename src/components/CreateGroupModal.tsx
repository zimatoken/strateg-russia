import { useMemo, useState, useEffect } from 'react';
import AvatarPicker from './AvatarPicker';
import { getAvatarPath } from '../lib/avatarRegistry';
import { getAllContacts, type Contact } from '../core/contact';

interface CreateGroupModalProps {
  myId: string;
  contacts: string[];
  onCreate: (name: string, members: string[], avatarId: string) => void;
  onClose: () => void;
}

export default function CreateGroupModal({ myId, contacts, onCreate, onClose }: CreateGroupModalProps) {
  const [name, setName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([myId]);
  const [avatarId, setAvatarId] = useState('avatar-robot');
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [contactList, setContactList] = useState<Contact[]>([]);

  // STAGE6: Load actual contacts from IndexedDB
  useEffect(() => {
    void (async () => {
      const allContacts = await getAllContacts();
      setContactList(allContacts);
    })();
  }, []);

  const availableContacts = useMemo(() => {
    // Use actual contacts if available, otherwise fall back to string list
    if (contactList.length > 0) {
      return contactList.filter(c => c.id !== myId);
    }
    // STAGE6: fallback - use fixed timestamp for mock contacts
    return contacts.filter(contact => contact !== myId).map(id => ({
      id,
      name: id,
      avatar: 'avatar-robot',
      color: '#3b82f6',
      addedAt: 0
    } as Contact));
  }, [contacts, myId, contactList]);

  const toggleMember = (memberId: string) => {
    setSelectedMembers((current) => {
      if (current.includes(memberId)) {
        return current.filter((id) => id !== memberId);
      }
      return [...current, memberId];
    });
  };

  const handleCreate = () => {
    const trimmedName = name.trim();
    if (!trimmedName || selectedMembers.length < 2) return; // STAGE6: need at least 2 members (self + 1 other)
    onCreate(trimmedName, selectedMembers, avatarId);
    onClose();
  };

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}>
          <h2 className="modal-title">Создать группу</h2>

          {/* STAGE6: Group avatar selection */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>Аватар группы</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <img
                src={getAvatarPath(avatarId)}
                alt="Group avatar"
                style={{ width: 64, height: 64, borderRadius: '50%', cursor: 'pointer', border: '2px solid rgba(180,230,255,0.2)' }}
                onClick={() => setShowAvatarPicker(true)}
              />
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowAvatarPicker(true)}
              >
                Изменить аватар
              </button>
            </div>
          </div>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            <span style={{ fontWeight: 600 }}>Название группы</span>
            <input
              className="modal-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Например: Команда СибПак"
            />
          </label>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            <div style={{ fontWeight: 600 }}>Участники</div>
            {availableContacts.length === 0 ? (
              <div style={{ color: '#6b7280' }}>Нет доступных контактов. Сначала добавьте контакты.</div>
            ) : (
              <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid rgba(180,230,255,0.1)', borderRadius: 8, padding: 8 }}>
                {availableContacts.map((contact) => (
                  <label
                    key={contact.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: 8,
                      borderRadius: 6,
                      cursor: 'pointer',
                      transition: 'background 0.15s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <input
                      type="checkbox"
                      checked={selectedMembers.includes(contact.id)}
                      onChange={() => toggleMember(contact.id)}
                      style={{ width: 18, height: 18 }}
                    />
                    <img
                      src={getAvatarPath(contact.avatar)}
                      alt=""
                      style={{ width: 32, height: 32, borderRadius: '50%' }}
                    />
                    <span style={{ flex: 1 }}>{contact.name}</span>
                    <span style={{ fontSize: 12, color: 'rgba(200,230,255,0.5)' }}>{contact.id}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="modal-actions">
            <button type="button" className="modal-btn modal-btn-secondary" onClick={onClose}>
              Отмена
            </button>
            <button
              type="button"
              className="modal-btn modal-btn-primary"
              onClick={handleCreate}
              disabled={!name.trim() || selectedMembers.length < 2}
            >
              Создать группу
            </button>
          </div>
        </div>
      </div>

      {showAvatarPicker && (
        <AvatarPicker
          isOpen={showAvatarPicker}
          onClose={() => setShowAvatarPicker(false)}
          onSelect={(selectedAvatarId) => {
            setAvatarId(selectedAvatarId);
            setShowAvatarPicker(false);
          }}
          currentAvatarId={avatarId}
        />
      )}
    </>
  );
}
