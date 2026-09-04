import React from 'react';
import { useLanguage } from '../../hooks/useLanguage';

interface Props {
  name: string;
  size?: number;
  onDownload?: () => void;
}

export const FileAttachment: React.FC<Props> = ({ name, size, onDownload }) => {
  const { t } = useLanguage();
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <div style={{ padding: 8, background: 'var(--bg-secondary)', borderRadius: 6 }}>{t('messenger_file') || 'File'}</div>
      <div style={{ flex: 1 }}>{name} {size ? `• ${(size / 1024).toFixed(1)}KB` : ''}</div>
      {onDownload && <button onClick={onDownload} style={{ background: 'transparent', border: 'none', color: 'var(--primary)' }}>{t('messenger_download') || 'Download'}</button>}
    </div>
  );
};

export default FileAttachment;
