import type { ReplyTo } from '../types/message';

interface ReplyBarProps {
  replyTo: ReplyTo;
  onCancel: () => void;
  onClick?: () => void;
}

export default function ReplyBar({ replyTo, onCancel, onClick }: ReplyBarProps) {
  return (
    <div className="reply-bar">
      <button type="button" className="reply-bar-content" onClick={onClick}>
        <span className="reply-bar-label">Ответ {replyTo.senderName}</span>
        <span className="reply-bar-text">{replyTo.text}</span>
      </button>
      <button type="button" className="reply-bar-cancel" onClick={onCancel} aria-label="Отменить ответ">
        ✕
      </button>
    </div>
  );
}
