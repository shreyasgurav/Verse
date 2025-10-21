import type { Message } from '@extension/storage';
import { memo } from 'react';

interface MessageListProps {
  messages: Message[];
  isDarkMode?: boolean;
}

export default memo(function MessageList({ messages, isDarkMode = false }: MessageListProps) {
  return (
    <div className="max-w-full space-y-3">
      {messages.map((message, index) => (
        <MessageBlock
          key={`${message.actor}-${message.timestamp}-${index}`}
          message={message}
          isDarkMode={isDarkMode}
        />
      ))}
    </div>
  );
});

interface MessageBlockProps {
  message: Message;
  isDarkMode?: boolean;
}

function MessageBlock({ message, isDarkMode = false }: MessageBlockProps) {
  const isUser = message.actor === 'user';
  const isProgress = message.messageType === 'progress';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[70%] px-3 py-2 ${
          isUser
            ? 'bg-blue-500 text-white'
            : isProgress
            ? '' // No background for progress
            : 'text-gray-300'
        }`}
        style={{ borderRadius: isUser ? '20px' : '12px' }}>
        
        {/* CASE 1: Progress (3 bouncing dots) */}
        {isProgress && (
          <div className="flex items-center space-x-1">
            <div className="flex space-x-1">
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        )}
        
        {/* CASE 2: Normal message content */}
        {!isProgress && message.content && (
          <div className="whitespace-pre-wrap break-words text-sm">
            {message.content}
          </div>
        )}
      </div>
    </div>
  );
}
