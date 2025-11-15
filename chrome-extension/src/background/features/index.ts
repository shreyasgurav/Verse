/**
 * Background Script Feature Registry
 * Registers all website-specific message handlers
 */

import type { FeatureMessageHandler } from './types';
import { googleFormsHandlers } from './google-forms';
import { universalFormsHandlers } from './universal-forms';

const allHandlers: FeatureMessageHandler[] = [
  ...googleFormsHandlers, // Google Forms specific (higher priority)
  ...universalFormsHandlers, // Universal form filler (fallback)
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
