/**
 * Google Forms Fill Button Component
 */

import { useState, useEffect } from 'react';
import type { FeatureButtonProps } from '../types';

export default function FormFillButton({ tabId, tabMeta, isDarkMode }: FeatureButtonProps) {
  const [isFillingForm, setIsFillingForm] = useState(false);

  // Listen for messages from content script about form filling state
  useEffect(() => {
    const messageListener = (message: any) => {
      if (message.type === 'FORM_FILL_STARTED') {
        setIsFillingForm(true);
      } else if (message.type === 'FORM_FILL_STOPPED' || message.type === 'FORM_FILL_COMPLETE') {
        setIsFillingForm(false);
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);

    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
    };
  }, []);

  const handleClick = async () => {
    try {
      if (isFillingForm) {
        // Stop filling
        await chrome.tabs.sendMessage(tabId, { type: 'STOP_FORM_FILL' });
        setIsFillingForm(false);
      } else {
        // Start filling
        await chrome.tabs.sendMessage(tabId, { type: 'START_FORM_FILL' });
        setIsFillingForm(true);
      }
    } catch (error) {
      console.error('Failed to trigger form filler:', error);
      setIsFillingForm(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      style={{
        background: 'none',
        border: 'none',
        color: '#e5e7eb',
        cursor: 'pointer',
        fontSize: '12px',
        padding: 0,
        marginTop: '6px',
        textAlign: 'left',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        width: '100%',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.opacity = '0.7';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.opacity = '1';
      }}>
      {tabMeta?.icon && (
        <img src={tabMeta.icon} alt="" style={{ width: 16, height: 16, borderRadius: 3, flexShrink: 0 }} />
      )}
      <span>{isFillingForm ? 'Stop' : 'Fill this Form'}</span>
      {isFillingForm ? (
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ marginLeft: 'auto', flexShrink: 0 }}>
          <path
            d="M2 2L10 10M10 2L2 10"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ marginLeft: 'auto', flexShrink: 0 }}>
          <path
            d="M4.5 2L8.5 6L4.5 10"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}
