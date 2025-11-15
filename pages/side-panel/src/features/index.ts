/**
 * Side Panel Feature Registry
 * Detects and provides UI components for website-specific features
 */

import type { SidePanelFeature } from './types';
import { googleFormsFeature } from './google-forms';
import { universalFormsFeature } from './universal-forms';

export const features: SidePanelFeature[] = [
  googleFormsFeature, // Google Forms (specific, higher priority)
  universalFormsFeature, // Universal form filler (works on all sites)
];

export function detectFeatures(url: string): SidePanelFeature[] {
  if (!url) return [];
  return features.filter(feature => feature.detect(url));
}

export function getFeatureButton(url: string) {
  const detectedFeatures = detectFeatures(url);
  // Return first matching feature button (Google Forms takes priority over universal)
  return detectedFeatures.length > 0 ? detectedFeatures[0].button : null;
}
