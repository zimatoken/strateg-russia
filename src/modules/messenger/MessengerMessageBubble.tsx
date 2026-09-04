import React, { useState } from 'react';
import type { FileAttachment } from '../../core/dialogCore';

interface MessageBubbleProps {
  text: string;
  isUser: boolean;
  timestamp: Date;
  messageId?: string;
  currentUserId?: string;
  type?: string;
  files?: FileAttachment[];
  fileName?: string;
  hasAttachment?: boolean;
  onDeleteMessage?: (messageId: string) => void;
  isEncrypted?: boolean; // STAGE8: E2EE indicator
}

const MessengerMessageBubble: React.FC<MessageBubbleProps> = ({
  text,
  isUser,
  timestamp,
  messageId,
  type,
  files,
  fileName,
  hasAttachment,
  onDeleteMessage,
  isEncrypted,
}) => {
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });

  // HOTFIX: file messages render as attachment, not raw text
  const showAsFile = type === 'file' || hasAttachment || Boolean(fileName) || Boolean(files?.length);
  const displayText = showAsFile ? '' : text;

  const handleRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  };

  const handleDelete = () => {
    if (messageId && onDeleteMessage) {
      onDeleteMessage(messageId);
    }
    setShowContextMenu(false);
  };

  const handleHoverDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (messageId && onDeleteMessage) {
      onDeleteMessage(messageId);
    }
  };

  return (
    <>
      <div 
        className={`message-bubble ${isUser ? 'user-message' : 'ai-message'}`} 
        onContextMenu={handleRightClick}
      >
        <button
          type="button"
          className="msg-delete-btn"
          onClick={handleHoverDelete}
          title="Удалить"
        >
          🗑️
        </button>
        {displayText}
        {showAsFile && files?.map((file, index) => (
          <div className="msg-file-attachment" key={`${file.name}-${index}`}>
            {file.type.startsWith('image/') ? (
              <img
                className="file-thumbnail"
                src={`data:${file.type};base64,${file.data}`}
                alt={file.name}
              />
            ) : (
              <a className="file-download" href={`data:${file.type};base64,${file.data}`} download={file.name}>
                <span className="file-icon">📎</span>
                <span className="file-name">{file.name}</span>
              </a>
            )}
          </div>
        ))}
        {showAsFile && !files?.length && fileName ? (
          <div className="msg-file-attachment">
            <span className="file-icon">📎</span>
            <span className="file-name">{fileName}</span>
          </div>
        ) : null}
        {isEncrypted && <span className="message-encrypted" title="Зашифровано">🔒</span>}
        <div className="message-time">
          {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
      {showContextMenu && (
        <div 
          className="context-menu"
          style={{ left: contextMenuPos.x, top: contextMenuPos.y }}
          onMouseLeave={() => setShowContextMenu(false)}
        >
          <div className="context-menu-item" onClick={handleDelete}>
            🗑️ Удалить
          </div>
        </div>
      )}
    </>
  );
};

export default MessengerMessageBubble;
