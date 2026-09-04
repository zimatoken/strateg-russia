import React, { useRef } from 'react';
import { useLanguage } from '../../hooks/useLanguage';
// import { FileAttachment } from './FileAttachment';
import { getUserProfile } from '../../core/identity';

export const ChatWindow: React.FC<{ peerId: string; messages?: any[] }> = ({ peerId, messages = [] }) => {
  const { t } = useLanguage();
  const boxRef = useRef<HTMLDivElement | null>(null);

  // Dumb component: messages are provided via props. Sending is logged to console.
  const send = () => {
    console.log('Send message (UI only):', peerId);
    // No-op: integrate with dialogCore in future
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, overflow: 'auto', padding: 12 }} ref={boxRef}>
        {messages.length === 0 && <div style={{ color: 'var(--text-secondary)' }}>{t('chat_no_messages') || 'Нет сообщений в этом чате'}</div>}
        {messages.map((m, idx) => (
          <div key={idx} style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{m.from === getUserProfile()?.id ? 'You' : m.from}</div>
            <div style={{ background: 'var(--bg-card)', padding: 8, borderRadius: 8 }}>{m.body || JSON.stringify(m)}</div>
          </div>
        ))}
      </div>

      <div style={{ padding: 8, borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
        <input placeholder={t('messenger_placeholder') || ''} style={{ flex: 1, padding: 8, borderRadius: 8, border: '1px solid var(--border)' }} />
        <button onClick={send} style={{ padding: '8px 12px' }}>{t('messenger_send') || 'Send'}</button>
      </div>
    </div>
  );
};

export default ChatWindow;
