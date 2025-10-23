import type { Message } from '@extension/storage';
import { memo } from 'react';
import ThinkingBlock from './ThinkingBlock';

interface MessageListProps {
  messages: Message[];
  isDarkMode?: boolean;
}

export default memo(function MessageList({ messages, isDarkMode = false }: MessageListProps) {
  return (
    <div className="max-w-full space-y-3">
      {messages.map((message, index) => {
        // Use taskId for thinking/progress messages to maintain stable key during updates
        const key = message.messageType === 'thinking' || message.messageType === 'progress'
          ? `${message.messageType}-${message.taskId}`
          : `${message.actor}-${message.timestamp}-${index}`;
        
        return (
          <MessageBlock
            key={key}
            message={message}
            isDarkMode={isDarkMode}
          />
        );
      })}
    </div>
  );
});

interface MessageBlockProps {
  message: Message;
  isDarkMode?: boolean;
}

const MessageBlock = memo(function MessageBlock({ message, isDarkMode = false }: MessageBlockProps) {
  const isUser = message.actor === 'user';
  const isProgress = message.messageType === 'progress';
  const isThinkingOnly = message.messageType === 'thinking';
  const hasThinking = message.thinkingSteps && message.thinkingSteps.length > 0;

  // For thinking-only messages (during task execution), only show the thinking block
  if (isThinkingOnly && hasThinking) {
    return (
      <div className="space-y-2">
        <ThinkingBlock 
          key={message.taskId || 'thinking'} 
          thinkingSteps={message.thinkingSteps!} 
          isDarkMode={isDarkMode} 
          isLive={true} 
        />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* DON'T show thinking blocks for completed tasks - too cluttered */}
      {/* Only show thinking block during live execution (handled above) */}

      {/* Show the actual message */}
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
    </div>
  );
});
