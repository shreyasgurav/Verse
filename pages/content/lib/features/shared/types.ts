/**
 * Shared types for content script features
 */

export interface WebsiteFeature {
  name: string;
  urlPattern: RegExp;
  init: () => void;
  cleanup?: () => void;
}
