import React, { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../../hooks/useLanguage';
import { FileAttachment } from './FileAttachment';
import { getDialogCore } from '../../core/dialogCore';
import { getUserProfile } from '../../core/identity';

export const ChatWindow: React.FC<{ peerId: string }> = ({ peerId }) => {
  const { t } = useLanguage();
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const core = getDialogCore();
  const boxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const msgs = await core.getMessagesForPeer(peerId).catch(() => []);
      if (!mounted) return;
      setMessages(msgs || []);
    })();

    const unsub = core.onMessage((from, msg) => {
      if (from === peerId) setMessages((m) => [...m, msg]);
    });

    return () => { mounted = false; unsub(); };
  }, [peerId]);

  useEffect(() => { boxRef.current?.scrollTo({ top: boxRef.current.scrollHeight, behavior: 'smooth' }); }, [messages]);

  const send = async () => {
    if (!text) return;
    try {
      await core.sendMessageToPeer(peerId, { type: 'text', body: text });
      setText('');
    } catch (e) {
      console.error(e);
      alert('Не удалось отправить сообщение');
    }
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
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder={t('messenger_placeholder') || ''} style={{ flex: 1, padding: 8, borderRadius: 8, border: '1px solid var(--border)' }} />
        <button onClick={send} style={{ padding: '8px 12px' }}>{t('messenger_send') || 'Send'}</button>
      </div>
    </div>
  );
};

export default ChatWindow;
