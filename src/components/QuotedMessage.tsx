import type { ReplyTo } from '../types/message';

interface QuotedMessageProps {
  replyTo: ReplyTo;
  onClick?: () => void;
}

export default function QuotedMessage({ replyTo, onClick }: QuotedMessageProps) {
  const preview = replyTo.text.length > 100 ? `${replyTo.text.slice(0, 97)}...` : replyTo.text;

  return (
    <button type="button" className="quoted-message" onClick={onClick}>
      <div className="quoted-message-bar" />
      <div className="quoted-message-body">
        <div className="quoted-message-author">{replyTo.senderName}</div>
        <div className="quoted-message-text">{preview}</div>
      </div>
    </button>
  );
}
