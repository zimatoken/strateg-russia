import { useMemo, useState } from 'react';
import { getUserId, getUserProfile } from '../core/identity';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../hooks/useTheme';
import { getAvatarPath } from '../lib/avatarRegistry';

const AVATAR_OPTIONS = [
  'avatar-ai',
  'avatar-robot',
  'avatar-man',
  'avatar-woman',
  'avatar-boy',
  'avatar-girl',
  'avatar-coder',
  'avatar-network',
];

export default function SettingsPage() {
  const { isDark, toggleTheme } = useTheme();
  const { lang, setLang, t } = useLanguage();
  const [userName, setUserName] = useState(() => localStorage.getItem('strateg_user_name') ?? '');
  const [selectedAvatar, setSelectedAvatar] = useState(() => localStorage.getItem('strateg_user_avatar') ?? 'avatar-robot');
  const [exportState, setExportState] = useState<'idle' | 'exporting' | 'done'>('idle');

  const userProfile = useMemo(() => getUserProfile(), []);

  const persistUserName = (value: string) => {
    const trimmed = value.trim();
    setUserName(trimmed);
    if (trimmed) {
      localStorage.setItem('strateg_user_name', trimmed);
    } else {
      localStorage.removeItem('strateg_user_name');
    }
  };

  const persistAvatar = (avatarId: string) => {
    setSelectedAvatar(avatarId);
    localStorage.setItem('strateg_user_avatar', avatarId);
  };

  const handleExport = () => {
    setExportState('exporting');

    const exportPayload = {
      exportedAt: new Date().toISOString(),
      language: lang,
      theme: isDark ? 'dark' : 'light',
      userId: getUserId(),
      userName: userName || userProfile.name || null,
      avatar: selectedAvatar,
    };

    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `strateg-settings-${Date.now()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);

    setTimeout(() => setExportState('done'), 400);
    setTimeout(() => setExportState('idle'), 1800);
  };

  return (
    <section className="settings-page">
      <div className="settings-page-header">
        <div>
          <span className="strateg-eyebrow">{t('settings_system')}</span>
          <h1>{t('settings_title')}</h1>
        </div>
      </div>

      <div className="settings-page-grid">
        <div className="settings-card">
          <div className="settings-card-header">
            <h2>{t('settings_theme')}</h2>
          </div>
          <div className="settings-segmented">
            <button
              type="button"
              className={`settings-segment ${isDark ? 'active' : ''}`}
              onClick={() => !isDark && toggleTheme()}
            >
              {t('settings_dark')}
            </button>
            <button
              type="button"
              className={`settings-segment ${!isDark ? 'active' : ''}`}
              onClick={() => isDark && toggleTheme()}
            >
              {t('settings_light')}
            </button>
          </div>
        </div>

        <div className="settings-card">
          <div className="settings-card-header">
            <h2>{t('settings_language')}</h2>
          </div>
          <div className="settings-segmented">
            <button
              type="button"
              className={`settings-segment ${lang === 'ru' ? 'active' : ''}`}
              onClick={() => setLang('ru')}
            >
              {t('settings_russian')}
            </button>
            <button
              type="button"
              className={`settings-segment ${lang === 'en' ? 'active' : ''}`}
              onClick={() => setLang('en')}
            >
              {t('settings_english')}
            </button>
          </div>
        </div>

        <div className="settings-card settings-card-wide">
          <div className="settings-card-header">
            <h2>{t('settings_account')}</h2>
          </div>

          <label className="settings-field">
            <span>{t('settings_user_name')}</span>
            <input
              type="text"
              value={userName}
              onChange={(event) => persistUserName(event.target.value)}
              placeholder={t('settings_user_name_placeholder')}
            />
          </label>

          <div className="settings-field">
            <span>{t('settings_avatar')}</span>
            <div className="settings-avatar-grid">
              {AVATAR_OPTIONS.map((avatarId) => (
                <button
                  key={avatarId}
                  type="button"
                  className={`settings-avatar-option ${selectedAvatar === avatarId ? 'selected' : ''}`}
                  onClick={() => persistAvatar(avatarId)}
                  aria-label={avatarId}
                >
                  <img src={getAvatarPath(avatarId)} alt={avatarId} />
                </button>
              ))}
            </div>
          </div>

          <div className="settings-field settings-id-box">
            <span>{t('settings_user_id')}</span>
            <strong>{userProfile.id || getUserId()}</strong>
          </div>

          <div className="settings-hint">{t('settings_save_hint')}</div>
        </div>

        <div className="settings-card settings-card-wide">
          <div className="settings-card-header">
            <h2>{t('settings_profile')}</h2>
          </div>

          <div className="settings-profile-preview">
            <img src={getAvatarPath(selectedAvatar)} alt="Selected profile avatar" />
            <div>
              <strong>{userName || 'STRATEG User'}</strong>
              <small>{userProfile.id || getUserId()}</small>
            </div>
          </div>

          <button type="button" className="settings-export-btn" onClick={handleExport}>
            {exportState === 'exporting' ? t('settings_exporting') : exportState === 'done' ? t('settings_export_success') : t('settings_export')}
          </button>
        </div>
      </div>
    </section>
  );
}
