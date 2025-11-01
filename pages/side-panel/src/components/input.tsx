import React from 'react';
import ChatInput from './ChatInput';

interface TabMeta {
  title: string;
  icon?: string;
  url?: string;
}

interface InputProps {
  currentTabMeta: TabMeta | null;
  inputEnabled: boolean;
  isHistoricalSession: boolean;
  showStopButton: boolean;
  setInputTextRef: React.MutableRefObject<((text: string) => void) | null>;
  onSendMessage: (text: string, displayText?: string) => void | Promise<void>;
  onStopTask: () => void | Promise<void>;
  onTextChange: (text: string) => void;
  isDarkMode: boolean;
  currentSessionId: string | null;
  replayEnabled: boolean;
  onReplay: (historicalSessionId: string) => void;
}

export default function InputSection({
  currentTabMeta,
  inputEnabled,
  isHistoricalSession,
  showStopButton,
  setInputTextRef,
  onSendMessage,
  onStopTask,
  onTextChange,
  isDarkMode,
  currentSessionId,
  replayEnabled,
  onReplay,
}: InputProps) {
  const shouldShowTabChip =
    !!currentTabMeta?.url &&
    !['about:blank', 'chrome://new-tab-page', 'chrome://new-tab-page/'].includes(currentTabMeta.url);

  return (
    <>
      {shouldShowTabChip && (
        <div className="tab-chip">
          {currentTabMeta?.icon && (
            <img
              src={currentTabMeta.icon}
              alt=""
              style={{ width: 16, height: 16, borderRadius: 3, marginRight: 8 }}
            />
          )}
          <span className="tab-chip-title">{currentTabMeta?.title || 'This page'}</span>
        </div>
      )}

      <div className={`chat-input-container p-2 shadow-sm backdrop-blur-sm`}>
        <ChatInput
          onSendMessage={onSendMessage}
          onStopTask={onStopTask}
          disabled={!inputEnabled || isHistoricalSession}
          showStopButton={showStopButton}
          setContent={setter => {
            setInputTextRef.current = setter;
          }}
          onTextChange={onTextChange}
          isDarkMode={isDarkMode}
          historicalSessionId={isHistoricalSession && replayEnabled ? currentSessionId : null}
          onReplay={onReplay}
        />
      </div>
    </>
  );
}