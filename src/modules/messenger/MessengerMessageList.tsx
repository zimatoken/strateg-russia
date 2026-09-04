import React from 'react';
import MessengerMessageBubble from './MessengerMessageBubble';

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

const MessengerMessageList: React.FC<MessageListProps> = ({ messages, currentUserId, onDeleteMessage }) => {
  return (
    <div className="message-list">
      {messages.map((message) => (
        <MessengerMessageBubble
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

export default MessengerMessageList;
