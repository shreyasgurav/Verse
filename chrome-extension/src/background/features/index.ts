/**
 * Background Script Feature Registry
 * Registers all website-specific message handlers
 */

import type { FeatureMessageHandler } from './types';
import { googleFormsHandlers } from './google-forms';

const allHandlers: FeatureMessageHandler[] = [
  ...googleFormsHandlers,
  // Add more feature handlers here
];

export function registerAllFeatureHandlers() {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Find matching handler
    const handler = allHandlers.find(h => h.type === message.type);

    if (handler) {
      return handler.handler(message, sender, sendResponse);
    }

    // No handler found, let other listeners handle it
    return false;
  });
}
