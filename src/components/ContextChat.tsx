import React, { useEffect, useMemo, useState } from 'react';
import { useDialogCore } from '../core/useDialogCore';
import { useLanguage } from '../context/LanguageContext';

interface ContextInfo {
  type: 'deal' | 'barter' | 'project';
  id: string;
  title: string;
}

interface ContextChatProps {
  context: ContextInfo;
  contactId?: string;
  onClose?: () => void;
}

export const ContextChat: React.FC<ContextChatProps> = ({ context, contactId, onClose }) => {
  const { t } = useLanguage();
  const { messages, sendMessage, connect } = useDialogCore() as any;
  const [input, setInput] = useState('');

  useEffect(() => {
    // ensure transport connected
    connect();
  }, []);

  const contextMessages = useMemo(() => {
    return messages.filter((m: any) => m.context && m.context.type === context.type && m.context.id === context.id);
  }, [messages, context]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    const to = contactId ? contactId.toUpperCase() : `ROOM-${context.type.toUpperCase()}-${context.id}`;
    sendMessage(to, text, undefined, undefined, context);
    setInput('');
  };

  return (
    <div className="context-chat">
      <div className="context-chat-header">
        <div>
          <strong>{context.title}</strong>
          <div className="context-chat-subtitle">{t(`chat_context_${context.type}`)}</div>
        </div>
        {onClose && <button className="strateg-close-btn" onClick={onClose}>✕</button>}
      </div>
      <div className="context-chat-body">
        {contextMessages.length === 0 ? (
          <div className="context-chat-empty">{t('chat_no_messages')}</div>
        ) : (
          contextMessages.map((msg: any) => (
            <div key={msg.id} className={`context-chat-message ${msg.isUser ? 'me' : 'them'}`}>
              <div className="context-chat-text">{msg.text}</div>
              <div className="context-chat-meta">{new Date(msg.timestamp).toLocaleString()}</div>
            </div>
          ))
        )}
      </div>
      <div className="context-chat-footer">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
          placeholder={t('chat_placeholder')}
        />
        <button onClick={handleSend}>{t('chat_send')}</button>
      </div>
    </div>
  );
};

export default ContextChat;

