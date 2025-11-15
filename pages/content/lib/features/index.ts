/**
 * Content Script Feature Registry
 * Auto-loads website-specific features based on current URL
 */

import type { WebsiteFeature } from './shared/types';
import { googleFormsFeature } from './google-forms';
import { universalFormsFeature } from './universal-forms';

const features: WebsiteFeature[] = [
  googleFormsFeature, // Google Forms (specific implementation)
  universalFormsFeature, // Universal form filler (works on all sites)
];

export function initializeFeatures() {
  const currentUrl = window.location.href;

  features.forEach(feature => {
    if (feature.urlPattern.test(currentUrl)) {
      console.log(`[Verse] Initializing feature: ${feature.name}`);
      feature.init();
    }
  });
}

// Auto-initialize on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeFeatures);
} else {
  initializeFeatures();
}

// Re-initialize on URL changes (for SPAs)
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    initializeFeatures();
  }
}).observe(document, { subtree: true, childList: true });
