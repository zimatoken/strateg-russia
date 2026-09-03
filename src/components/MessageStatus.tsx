import type { MessageStatus } from '../core/dialogCore';

interface MessageStatusProps {
  status: MessageStatus;
  timestamp: number;
}

export default function MessageStatus({ status, timestamp }: MessageStatusProps) {
  const icon = status === 'read' ? '✓✓' : status === 'delivered' ? '✓✓' : '✓';
  const title = new Date(timestamp).toLocaleTimeString();

  return (
    <span className={`message-status message-status-${status}`} title={title} aria-label={`Status: ${status}`}>
      {icon}
    </span>
  );
}
