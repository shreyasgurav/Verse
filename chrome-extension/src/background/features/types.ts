/**
 * Shared types for background script features
 */

export interface FeatureMessageHandler {
  type: string;
  handler: (
    message: any,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void,
  ) => boolean | void;
}
