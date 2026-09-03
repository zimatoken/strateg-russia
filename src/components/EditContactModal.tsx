import { useState, useEffect } from 'react';
import { Avatar } from './Avatar';
import { updateContactName, updateContactAvatar, type Contact, AVATAR_LIBRARY } from '../core/contact';

interface EditContactModalProps {
  contact: Contact | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

export default function EditContactModal({ contact, isOpen, onClose, onSave }: EditContactModalProps) {
  const [name, setName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('');

  useEffect(() => {
    if (contact) {
      setName(contact.name);
      setSelectedAvatar(contact.avatar);
    }
  }, [contact]);

  if (!isOpen || !contact) return null;

  const handleSave = async () => {
    try {
      await updateContactName(contact.id, name);
      await updateContactAvatar(contact.id, selectedAvatar);
      onSave();
      onClose();
    } catch (error) {
      console.error('Failed to update contact:', error);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">Редактировать контакт</div>

        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="modal-input"
          placeholder="Имя контакта"
          maxLength={50}
        />

        <div className="avatar-grid">
          {AVATAR_LIBRARY.map((avatar) => (
            <button
              key={avatar}
              type="button"
              className={`avatar-option ${selectedAvatar === avatar ? 'selected' : ''}`}
              onClick={() => setSelectedAvatar(avatar)}
            >
              <Avatar type={avatar} size={48} color="#3b82f6" />
            </button>
          ))}
        </div>

        <div className="modal-actions">
          <button type="button" className="modal-btn modal-btn-secondary" onClick={onClose}>
            Отмена
          </button>
          <button type="button" className="modal-btn modal-btn-primary" onClick={handleSave}>
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}
