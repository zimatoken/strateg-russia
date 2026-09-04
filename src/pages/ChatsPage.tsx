import { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { MessengerContextChat as ContextChat } from '../modules/messenger/MessengerContextChat';
import { getDialogCore } from '../core/dialogCore';

export default function ChatsPage() {
  const { t } = useLanguage();
  const dialogCore = getDialogCore();
  const [selectedContext, setSelectedContext] = useState<{ type: 'deal' | 'barter' | 'project'; id: string; title: string } | null>(null);
  const allMessages = dialogCore ? dialogCore.getMessages() : [];

  // Group messages by context
  const groupedChats = allMessages.reduce((acc, msg) => {
    if (msg.context) {
      const key = `${msg.context.type}-${msg.context.id}`;
      if (!acc[key]) {
        acc[key] = {
          type: msg.context.type,
          id: msg.context.id,
          title: msg.context.title,
          lastMessage: msg.text,
          lastMessageTime: msg.timestamp,
          messageCount: 0
        };
      }
      acc[key].messageCount++;
      if (msg.timestamp > acc[key].lastMessageTime) {
        acc[key].lastMessage = msg.text;
        acc[key].lastMessageTime = msg.timestamp;
      }
    }
    return acc;
  }, {} as Record<string, {
    type: 'deal' | 'barter' | 'project';
    id: string;
    title: string;
    lastMessage: string;
    lastMessageTime: number;
    messageCount: number;
  }>);

  const chatList = Object.values(groupedChats).sort((a, b) => b.lastMessageTime - a.lastMessageTime);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'только что';
    if (diffMins < 60) return `${diffMins} мин назад`;
    if (diffHours < 24) return `${diffHours} ч назад`;
    if (diffDays < 7) return `${diffDays} д назад`;
    return date.toLocaleDateString('ru-RU');
  };

  const getContextIcon = (type: string) => {
    switch (type) {
      case 'deal': return '💼';
      case 'barter': return '🔄';
      case 'project': return '📋';
      default: return '💬';
    }
  };

  return (
    <section className="strateg-page">
      <div className="strateg-page-heading">
        <div>
          <span className="strateg-eyebrow">💬 {t('chats_title')}</span>
          <h1>Контекстные чаты</h1>
          <p>Чаты по сделкам, бартерным предложениям и проектам</p>
        </div>
      </div>

      {selectedContext ? (
        <div className="strateg-chat-view">
          <button className="strateg-back-btn" onClick={() => setSelectedContext(null)}>
            ← Назад к списку
          </button>
          <ContextChat
            context={selectedContext}
            onClose={() => setSelectedContext(null)}
          />
        </div>
      ) : (
        <div className="strateg-chats-list">
          {chatList.length === 0 ? (
            <div className="strateg-empty-module">
              <span>💬</span>
              <h2>{t('chats_empty')}</h2>
              <p>Начните диалог в сделках или бартерных предложениях</p>
            </div>
          ) : (
            <div className="strateg-chat-cards">
              {chatList.map((chat) => (
                <div
                  key={`${chat.type}-${chat.id}`}
                  className="strateg-chat-card"
                  onClick={() => setSelectedContext({ type: chat.type, id: chat.id, title: chat.title })}
                >
                  <div className="strateg-chat-card-header">
                    <span className="strateg-chat-icon">{getContextIcon(chat.type)}</span>
                    <div className="strateg-chat-card-info">
                      <span className="strateg-chat-type">{t(`chat_context_${chat.type}`)}</span>
                      <span className="strateg-chat-title">{chat.title}</span>
                    </div>
                  </div>
                  <div className="strateg-chat-card-body">
                    <p className="strateg-chat-last-message">
                      {chat.lastMessage}
                    </p>
                    <span className="strateg-chat-time">{formatTime(chat.lastMessageTime)}</span>
                  </div>
                  <div className="strateg-chat-card-footer">
                    <span className="strateg-chat-count">{chat.messageCount} сообщений</span>
                    <button className="strateg-chat-open-btn">{t('chat_open')}</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
