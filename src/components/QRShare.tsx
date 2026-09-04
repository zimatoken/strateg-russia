import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useLanguage } from '../hooks/useLanguage';

interface QRShareProps {
  value: string;
  onScan?: (data: string) => void;
  status?: 'idle' | 'connecting' | 'connected' | 'error';
}

export const QRShare: React.FC<QRShareProps> = ({ value, onScan, status = 'idle' }) => {
  const { t } = useLanguage();
  const [inputValue, setInputValue] = useState('');

  const handleSubmit = () => {
    if (inputValue && onScan) {
      onScan(inputValue);
      setInputValue('');
    }
  };

  const statusText: Record<string, string> = {
    idle: t('messenger_scan') || 'Ожидание сканирования',
    connecting: t('messenger_connecting') || 'Подключение...',
    connected: t('messenger_connected') || 'Подключено',
    error: 'Ошибка соединения',
  };

  return (
    <div className="qr-share" style={{ textAlign: 'center', padding: '1rem' }}>
      <div style={{ background: '#fff', display: 'inline-block', padding: '0.5rem', borderRadius: '8px' }}>
        <QRCodeSVG value={value} size={220} level="H" includeMargin />
      </div>
      <p style={{ margin: '0.5rem 0', fontWeight: 'bold', color: 'var(--text)' }}>
        {statusText[status]}
      </p>
      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '0.5rem' }}>
        <input
          type="text"
          placeholder="Вставьте данные из QR"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          style={{ flex: 1, padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '4px', background: 'var(--bg)', color: 'var(--text)' }}
        />
        <button onClick={handleSubmit} style={{ padding: '0.5rem 1rem', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '4px' }}>
          Подключиться
        </button>
      </div>
      <button onClick={() => navigator.clipboard?.writeText(value)} style={{ marginTop: '0.5rem', background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}>
        Скопировать данные
      </button>
    </div>
  );
};

