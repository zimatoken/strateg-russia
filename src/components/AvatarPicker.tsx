import { useEffect, useState } from 'react';
import { ALL_AVATARS } from '../lib/avatarRegistry';
import { AvatarCategory } from '../types/avatar';

interface AvatarPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (avatarId: string) => void;
  currentAvatarId?: string;
}

const CATEGORY_LABELS: Record<AvatarCategory, string> = {
  character: 'Персонажи',
  pet: 'Животные',
  robot: 'Роботы',
  silhouette: 'Силуэты',
  icon: 'Иконки',
  tech: 'Техно',
};

export default function AvatarPicker({ isOpen, onClose, onSelect, currentAvatarId }: AvatarPickerProps) {
  const [selectedCategory, setSelectedCategory] = useState<AvatarCategory | 'all'>('all');
  const [selectedAvatar, setSelectedAvatar] = useState<string | undefined>(currentAvatarId);

  useEffect(() => {
    if (isOpen) {
      setSelectedAvatar(currentAvatarId);
      setSelectedCategory('all');
    }
  }, [isOpen, currentAvatarId]);

  if (!isOpen) return null;

  const categories: (AvatarCategory | 'all')[] = ['all', 'character', 'pet', 'robot', 'silhouette', 'icon', 'tech'];

  const filteredAvatars = selectedCategory === 'all' 
    ? ALL_AVATARS 
    : ALL_AVATARS.filter(a => a.category === selectedCategory);

  const handleAvatarClick = (avatarId: string) => {
    setSelectedAvatar(avatarId);
  };

  const handleSelect = () => {
    if (selectedAvatar) {
      onSelect(selectedAvatar);
      onClose();
    }
  };

  return (
    <div className="avatar-picker-overlay" onClick={onClose}>
      <div className="avatar-picker-content" onClick={(e) => e.stopPropagation()}>
        <div className="avatar-picker-header">
          <h2 className="avatar-picker-title">Выберите аватар</h2>
          <button className="avatar-picker-close" onClick={onClose}>×</button>
        </div>

        <div className="avatar-picker-tabs">
          {categories.map(cat => (
            <button
              key={cat}
              className={`avatar-picker-tab ${selectedCategory === cat ? 'avatar-picker-tab-active' : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat === 'all' ? 'Все' : CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>

        <div className="avatar-picker-grid">
          {filteredAvatars.map(avatar => (
            <div
              key={avatar.id}
              className={`avatar-picker-item ${selectedAvatar === avatar.id ? 'avatar-picker-item-selected' : ''}`}
              onClick={() => handleAvatarClick(avatar.id)}
              title={avatar.label}
            >
              <img
                src={avatar.path}
                alt={avatar.label}
                className="avatar-picker-item-img"
              />
            </div>
          ))}
        </div>

        <div className="avatar-picker-footer">
          <button className="avatar-picker-btn avatar-picker-btn-secondary" onClick={onClose}>
            Отмена
          </button>
          <button 
            className="avatar-picker-btn avatar-picker-btn-primary" 
            onClick={handleSelect}
            disabled={!selectedAvatar}
          >
            Выбрать
          </button>
        </div>
      </div>
    </div>
  );
}
