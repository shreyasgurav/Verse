import { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowUp, Square } from 'lucide-react';
import { t } from '@extension/i18n';

interface ChatInputProps {
  onSendMessage: (text: string, displayText?: string) => void;
  onStopTask: () => void;
  disabled: boolean;
  showStopButton: boolean;
  setContent?: (setter: (text: string) => void) => void;
  onTextChange?: (text: string) => void;
  isDarkMode?: boolean;
  // Historical session ID - if provided, shows replay button instead of send button
  historicalSessionId?: string | null;
  onReplay?: (sessionId: string) => void;
}

export default function ChatInput({
  onSendMessage,
  onStopTask,
  disabled,
  showStopButton,
  setContent,
  onTextChange,
  isDarkMode = false,
  historicalSessionId,
  onReplay,
}: ChatInputProps) {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Notify parent of text changes
  useEffect(() => {
    if (onTextChange) {
      onTextChange(text);
    }
  }, [text, onTextChange]);

  // Expose a method to set content from outside
  useEffect(() => {
    if (setContent) {
      setContent(setText);
    }
  }, [setContent]);

  // Auto-resize textarea based on content
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      // Reset to auto first to get accurate scrollHeight
      textarea.style.height = 'auto';

      const scrollHeight = textarea.scrollHeight;
      const maxHeight = 120; // cap around 5-6 lines

      if (!text || text.trim() === '') {
        // Maintain single-line height when empty
        textarea.style.height = '24px';
      } else {
        textarea.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
      }
    }
  }, [text]);

  // Adjust height when text changes
  useEffect(() => {
    adjustTextareaHeight();
  }, [text, adjustTextareaHeight]);

  // Force initial height on mount for empty input
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = '24px';
    }
  }, []);

  const handleSend = useCallback(() => {
    const trimmedText = text.trim();
    if (trimmedText && !disabled) {
      onSendMessage(trimmedText, trimmedText);
      setText('');
      // Reset textarea height after sending
      if (textareaRef.current) {
        textareaRef.current.style.height = '24px';
      }
    }
  }, [text, onSendMessage, disabled]);

  const handleStop = useCallback(() => {
    onStopTask();
  }, [onStopTask]);

  const handleReplay = useCallback(() => {
    if (historicalSessionId && onReplay) {
      onReplay(historicalSessionId);
    }
  }, [historicalSessionId, onReplay]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  return (
    <div 
      className="flex items-center gap-2 bg-black backdrop-blur-md pl-3 pr-2 py-2" 
      style={{ borderRadius: '20px' }}
    >
      {/* Input field */}
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="What can I do for you?"
        disabled={disabled}
        rows={1}
        className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none text-sm pl-2 disabled:opacity-50 resize-none overflow-hidden leading-tight"
        style={{ 
          minHeight: '24px',
          maxHeight: '120px',
          height: '24px',
          borderRadius: '0px',
          border: 'none',
          paddingTop: '2px',
          paddingBottom: '2px',
          lineHeight: '20px'
        }}
      />

      {/* Send/Stop/Replay button */}
      <button
        onClick={showStopButton ? handleStop : historicalSessionId ? handleReplay : handleSend}
        disabled={disabled && !showStopButton}
        className="flex-shrink-0 w-6 h-6 rounded-full bg-white flex items-center justify-center hover:opacity-80 transition-opacity disabled:opacity-50"
      >
        {showStopButton ? (
          <Square size={12} className="text-black fill-black" />
        ) : historicalSessionId ? (
          <ArrowUp size={14} className="text-black" />
        ) : (
          <ArrowUp size={14} className="text-black" />
        )}
      </button>
    </div>
  );
}