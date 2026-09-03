// STAGE9: Mobile chat view component

import { useRef, useEffect } from 'react';
import { Avatar } from '../Avatar';
import { VoiceRecorderButton } from '../VoiceRecorderButton';
import MessageInput from '../MessageInput';
import { VoiceMessagePlayer } from '../VoiceMessagePlayer';
import QuotedMessage from '../QuotedMessage';
import type { ReplyTo } from '../../types/message';

interface MobileChatViewProps {
  targetId: string;
  activeContact: { id: string; name: string; avatar: string; color: string } | null;
  messages: any[];
  isLoadingHistory: boolean;
  onBack: () => void;
  onSendMessage: (text: string, files?: File[], replyTo?: ReplyTo | null) => void;
  onVoiceRecord: (blob: Blob, duration: number) => void;
  onClearChat: () => void;
  onSettingsClick: () => void;
  connectionState: { isConnected: boolean; currentStrategId: string };
  attachedFile: File | null;
  setAttachedFile: (file: File | null) => void;
  contextMenuMessageId: string | null;
  contextMenuPos: { x: number; y: number };
  setContextMenuMessageId: (id: string | null) => void;
  setContextMenuPos: (pos: { x: number; y: number }) => void;
  imageModalOpen: boolean;
  imageModalSrc: string;
  setImageModalOpen: (open: boolean) => void;
  setImageModalSrc: (src: string) => void;
  profileName: string;
  profileAvatarId: string;
  replyTo?: ReplyTo | null;
  onReplyCancel?: () => void;
  onReplyClick?: (messageId?: string) => void;
  onReplyMessage?: (message: any) => void;
  highlightedMessageId?: string | null;
}

export default function MobileChatView({
  targetId,
  activeContact,
  messages,
  isLoadingHistory,
  onBack,
  onSendMessage,
  onVoiceRecord,
  onClearChat: _onClearChat,
  onSettingsClick: _onSettingsClick,
  connectionState,
  attachedFile: _attachedFile,
  setAttachedFile: _setAttachedFile,
  contextMenuMessageId,
  contextMenuPos,
  setContextMenuMessageId,
  setContextMenuPos,
  imageModalOpen,
  imageModalSrc,
  setImageModalOpen,
  setImageModalSrc,
  profileName,
  profileAvatarId: _profileAvatarId,
  replyTo,
  onReplyCancel,
  onReplyClick,
  onReplyMessage,
  highlightedMessageId
}: MobileChatViewProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);

  // STAGE9: Pull-to-refresh
  useEffect(() => {
    const container = listRef.current;
    if (!container) return;

    let startY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      startY = e.touches[0].clientY;
      touchStartY.current = startY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const endY = e.changedTouches[0].clientY;
      const diff = endY - startY;
      if (diff > 100 && container.scrollTop === 0) {
        // Pull-to-refresh trigger
        window.location.reload();
      }
    };

    container.addEventListener('touchstart', handleTouchStart);
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  // STAGE9: Auto-scroll to bottom
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="mobile-chat-view">
      {/* Mobile chat header */}
      <div className="mobile-chat-header">
        <button className="mobile-chat-back" onClick={onBack}>
          ←
        </button>
        {activeContact ? (
          <>
            <Avatar type={activeContact.avatar} size={40} color={activeContact.color} />
            <div className="mobile-chat-header-info">
              <div className="mobile-chat-header-name">{activeContact.name}</div>
              <div className="mobile-chat-header-id">{targetId}</div>
            </div>
          </>
        ) : (
          <div className="mobile-chat-header-info">
            <div className="mobile-chat-header-name">{targetId}</div>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="mobile-messages" ref={listRef}>
        {isLoadingHistory ? (
          <div className="empty-chat-text">Загрузка истории...</div>
        ) : messages.length === 0 ? (
          <div className="empty-chat">
            <div className="empty-chat-icon">💬</div>
            <div className="empty-chat-text">Начните диалог...</div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`msg-bubble ${msg.isUser ? 'msg-user' : 'msg-ai'} ${highlightedMessageId === msg.id ? 'msg-highlight' : ''}`}
              onContextMenu={(e) => {
                e.preventDefault();
                setContextMenuMessageId(msg.id);
                setContextMenuPos({ x: e.clientX, y: e.clientY });
              }}
              onDoubleClick={() => {
                // STAGE9: Double tap for context menu
                setContextMenuMessageId(msg.id);
                setContextMenuPos({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
              }}
            >
              {msg.isUser && <div className="msg-sender">{profileName}</div>}
              {msg.replyTo ? (
                <QuotedMessage replyTo={msg.replyTo} onClick={() => onReplyClick?.(msg.replyTo?.messageId)} />
              ) : null}
              {msg.text && <div className="msg-text">{msg.text}</div>}
              {msg.files?.map((f: any, i: number) => (
                <div key={`${f.name}-${i}`} style={{ marginTop: 6 }}>
                  {f.type?.startsWith('image/') ? (
                    <img
                      src={`data:${f.type};base64,${f.data}`}
                      alt={f.name}
                      className="msg-image"
                      onClick={() => {
                        setImageModalSrc(`data:${f.type};base64,${f.data}`);
                        setImageModalOpen(true);
                      }}
                    />
                  ) : (
                    <div className="msg-file">
                      📎 {f.name} ({(f.size / 1024).toFixed(1)} KB)
                    </div>
                  )}
                </div>
              ))}
              {msg.voiceData && (
                <div style={{ marginTop: 6 }}>
                  <VoiceMessagePlayer
                    file={{
                      name: `voice-${msg.id}.webm`,
                      type: 'audio/webm',
                      size: 0,
                      data: msg.voiceData,
                      meta: { duration: msg.voiceDuration }
                    }}
                  />
                </div>
              )}
              <div className="msg-meta">
                <span className="msg-time">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </span>
                {msg.isUser && msg.delivered && <span className="msg-delivered">✓</span>}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input area */}
      <div className="mobile-input-area">
        <div className="mobile-input-wrapper">
          <MessageInput
            disabled={!connectionState.isConnected}
            onSend={onSendMessage}
            replyTo={replyTo}
            onReplyCancel={onReplyCancel}
            onReplyClick={onReplyClick}
          />
          <VoiceRecorderButton
            disabled={!connectionState.isConnected}
            onRecord={onVoiceRecord}
          />
        </div>
      </div>

      {/* Context menu */}
      {contextMenuMessageId && (
        <div
          className="context-menu"
          style={{ left: contextMenuPos.x, top: contextMenuPos.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="context-menu-item"
            onClick={() => {
              onReplyMessage?.(messages.find((item) => item.id === contextMenuMessageId));
              setContextMenuMessageId(null);
            }}
          >
            Ответить
          </button>
          <button
            className="context-menu-item"
            onClick={() => {
              // Forward logic would go here
              setContextMenuMessageId(null);
            }}
          >
            Переслать
          </button>
          <button
            className="context-menu-item context-menu-item-danger"
            onClick={() => {
              // Delete logic would go here
              setContextMenuMessageId(null);
            }}
          >
            Удалить
          </button>
        </div>
      )}

      {/* Image modal */}
      {imageModalOpen && (
        <div className="image-modal-overlay" onClick={() => setImageModalOpen(false)}>
          <img src={imageModalSrc} alt="" className="image-modal-content" />
        </div>
      )}
    </div>
  );
}
