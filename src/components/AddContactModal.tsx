import { useState } from 'react';
import { addContact, type AvatarType } from '../core/contact';
import { Avatar } from './Avatar';
import AvatarPicker from './AvatarPicker';

interface AddContactModalProps {
  onClose: () => void;
  onSaved?: (id: string) => void;
}

export default function AddContactModal({ onClose, onSaved }: AddContactModalProps) {
  const [strategId, setStrategId] = useState('');
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState<AvatarType>('avatar-robot');
  const [loading, setLoading] = useState(false);
  // HOTFIX: sync avatars - use full AvatarPicker
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    const contactId = strategId.trim().toUpperCase() || name.trim().toUpperCase();
    console.log('Saving contact', { contactId, name: name.trim(), avatar });
    setLoading(true);
    try {
      await addContact({
        id: contactId,
        name: name.trim(),
        avatar,
        color: '#3b82f6',
        addedAt: Date.now(),
      });
      console.log('Contact saved', contactId);
      onSaved?.(contactId);
    } finally {
      setLoading(false);
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(event) => event.stopPropagation()}>
        <div className="modal-title">Добавить контакт</div>

        <input
          value={strategId}
          onChange={(event) => setStrategId(event.target.value)}
          className="modal-input"
          placeholder="STRATEG-ID (опционально)"
        />

        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="modal-input"
          placeholder="Имя контакта"
        />

        {/* HOTFIX: sync avatars - use full AvatarPicker instead of 8-item grid */}
        <div className="avatar-section">
          <label>Аватар</label>
          <div className="selected-avatar-preview">
            <Avatar type={avatar} size={64} color="#3b82f6" />
            <button
              type="button"
              className="btn-change-avatar"
              onClick={() => setShowAvatarPicker(true)}
            >
              Изменить
            </button>
          </div>
        </div>

        <div className="modal-actions">
          <button type="button" className="modal-btn modal-btn-secondary" onClick={onClose}>
            Отмена
          </button>
          <button type="button" className="modal-btn modal-btn-primary" onClick={handleSave} disabled={!name.trim() || loading}>
            {loading ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>

      {/* HOTFIX: sync avatars - AvatarPicker modal */}
      <AvatarPicker
        isOpen={showAvatarPicker}
        onClose={() => setShowAvatarPicker(false)}
        onSelect={(id) => {
          setAvatar(id as AvatarType);
          setShowAvatarPicker(false);
        }}
        currentAvatarId={avatar}
      />
    </div>
  );
}
