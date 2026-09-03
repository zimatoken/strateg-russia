import React from 'react';
import MessageBubble from './MessageBubble';

interface Message {
  id: number;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface MessageListProps {
  messages: Message[];
  currentUserId?: string;
  onDeleteMessage?: (messageId: string) => void;
}

const MessageList: React.FC<MessageListProps> = ({ messages, currentUserId, onDeleteMessage }) => {
  return (
    <div className="message-list">
      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          text={message.text}
          isUser={message.isUser}
          timestamp={message.timestamp}
          messageId={message.id.toString()}
          currentUserId={currentUserId}
          onDeleteMessage={onDeleteMessage}
        />
      ))}
    </div>
  );
};

export default MessageList;
