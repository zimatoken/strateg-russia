import { useMemo } from 'react';
import type { GroupChat, GroupMessage } from '../core/groupChat';
import { getAvatarPath } from '../lib/avatarRegistry';

interface GroupChatViewProps {
  group: GroupChat | null;
  messages: GroupMessage[];
  myId: string;
}

export default function GroupChatView({ group, messages, myId }: GroupChatViewProps) {
  const sortedMessages = useMemo(() => [...messages].sort((a, b) => a.timestamp - b.timestamp), [messages]);

  if (!group) {
    return (
      <div className="empty-chat">
        <div className="empty-chat-icon">👥</div>
        <div className="empty-chat-text">Выберите группу для начала общения</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
      {/* STAGE6: Group header with avatar */}
      <div className="chat-header">
        <div className="chat-header-avatar">
          <img
            src={getAvatarPath(group.avatarId || 'avatar-robot')}
            alt=""
            style={{ width: 40, height: 40, borderRadius: '50%' }}
          />
        </div>
        <div className="chat-header-info">
          <div className="chat-header-name">{group.name}</div>
          <div className="chat-header-id">{group.members.length} участников</div>
        </div>
      </div>

      <div className="messages">
        {sortedMessages.length === 0 ? (
          <div className="empty-chat">
            <div className="empty-chat-icon">💬</div>
            <div className="empty-chat-text">Начните диалог в группе...</div>
          </div>
        ) : (
          sortedMessages.map((message) => (
            <div
              key={message.id}
              className={`msg-bubble ${message.senderId === myId ? 'msg-user' : 'msg-ai'}`}
            >
              {/* STAGE6: Show sender name above message */}
              <div className="msg-sender">{message.senderId}</div>
              {message.text && <div className="msg-text">{message.text}</div>}
              {/* STAGE6: Show files in group messages */}
              {message.files?.map((f, i) => (
                <div key={`${f.name}-${i}`} style={{ marginTop: 6 }}>
                  {f.type.startsWith('image/') ? (
                    <img
                      src={`data:${f.type};base64,${f.data}`}
                      alt={f.name}
                      style={{ maxWidth: '100%', borderRadius: 8 }}
                    />
                  ) : (
                    <div style={{ fontSize: 13, color: 'rgba(200,230,255,0.7)' }}>
                      📎 {f.name} ({(f.size / 1024).toFixed(1)} KB)
                    </div>
                  )}
                </div>
              ))}
              <div className="msg-meta">
                <span className="msg-time">{new Date(message.timestamp).toLocaleTimeString()}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
