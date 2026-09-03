import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import AvatarPicker from './AvatarPicker';
import { getAvatarPath } from '../lib/avatarRegistry';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, avatarId: string) => void;
  currentName: string;
  currentAvatarId: string;
  currentStrategId: string;
}

export default function ProfileModal({ 
  isOpen, 
  onClose, 
  onSave, 
  currentName, 
  currentAvatarId,
  currentStrategId 
}: ProfileModalProps) {
  const [name, setName] = useState(currentName);
  const [avatarId, setAvatarId] = useState(currentAvatarId);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  // BUGFIX 4: reset form when modal opens with latest profile data
  useEffect(() => {
    if (isOpen) {
      setName(currentName);
      setAvatarId(currentAvatarId);
    }
  }, [isOpen, currentName, currentAvatarId]);

  const handleSave = () => {
    if (name.trim()) {
      onSave(name.trim(), avatarId);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content profile-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2 className="modal-title">Редактировать профиль</h2>
            <button className="modal-close" onClick={onClose}>×</button>
          </div>

          <div className="modal-body">
            <div className="profile-edit-section">
              <label className="profile-label">Аватар</label>
              <div className="profile-avatar-edit">
                <img 
                  src={getAvatarPath(avatarId)} 
                  alt="Avatar" 
                  className="profile-avatar-preview"
                  onClick={() => setShowAvatarPicker(true)}
                  style={{ cursor: 'pointer' }}
                />
                <button 
                  type="button" 
                  className="btn-secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    // HOTFIX: open AvatarPicker above profile modal overlay
                    setShowAvatarPicker(true);
                  }}
                >
                  Изменить
                </button>
              </div>
            </div>

            <div className="profile-edit-section">
              <label className="profile-label">Имя</label>
              <input
                type="text"
                className="profile-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Введите ваше имя"
                maxLength={30}
              />
            </div>

            <div className="profile-edit-section">
              <label className="profile-label">ID (только для чтения)</label>
              <input
                type="text"
                className="profile-input profile-input-readonly"
                value={currentStrategId}
                readOnly
              />
            </div>
          </div>

          <div className="modal-footer">
            <button className="btn-secondary" onClick={onClose}>
              Отмена
            </button>
            <button 
              className="btn-primary" 
              onClick={handleSave}
              disabled={!name.trim()}
            >
              Сохранить
            </button>
          </div>
        </div>
      </div>

      {showAvatarPicker && createPortal(
        <AvatarPicker
          isOpen={showAvatarPicker}
          onClose={() => setShowAvatarPicker(false)}
          onSelect={(selectedAvatarId) => {
            setAvatarId(selectedAvatarId);
            setShowAvatarPicker(false);
          }}
          currentAvatarId={avatarId}
        />,
        document.body
      )}
    </>
  );
}
