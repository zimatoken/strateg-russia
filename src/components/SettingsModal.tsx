import React, { useState } from 'react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAvatarPick?: () => void;
}

export default function SettingsModal({ isOpen, onClose, onAvatarPick }: SettingsModalProps) {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [language, setLanguage] = useState<'ru' | 'en'>('ru');

  if (!isOpen) return null;

  return (
    <div className="settings-modal-overlay" onClick={onClose}>
      <div className="settings-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="settings-modal-header">
          <h2 className="settings-modal-title">Настройки</h2>
          <button className="settings-modal-close" onClick={onClose}>×</button>
        </div>

        <div className="settings-modal-body">
          {/* Переключатель темы */}
          <div className="settings-option">
            <div className="settings-option-label">Тема</div>
            <div className="settings-toggle-group">
              <button 
                className={`settings-toggle ${theme === 'dark' ? 'active' : ''}`}
                onClick={() => setTheme('dark')}
              >
                Тёмная
              </button>
              <button 
                className={`settings-toggle ${theme === 'light' ? 'active' : ''}`}
                onClick={() => setTheme('light')}
              >
                Светлая
              </button>
            </div>
          </div>

          {/* Выбор языка */}
          <div className="settings-option">
            <div className="settings-option-label">Язык</div>
            <div className="settings-toggle-group">
              <button 
                className={`settings-toggle ${language === 'ru' ? 'active' : ''}`}
                onClick={() => setLanguage('ru')}
              >
                Русский
              </button>
              <button 
                className={`settings-toggle ${language === 'en' ? 'active' : ''}`}
                onClick={() => setLanguage('en')}
              >
                English
              </button>
            </div>
          </div>

          {onAvatarPick && (
            <div className="settings-option">
              <div className="settings-option-label">Профиль</div>
              <div className="settings-toggle-group">
                <button
                  type="button"
                  className="settings-toggle"
                  onClick={onAvatarPick}
                >
                  Сменить аватар
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="settings-modal-footer">
          <button className="settings-modal-btn" onClick={onClose}>
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
