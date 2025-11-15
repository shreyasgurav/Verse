/**
 * Side Panel Feature Registry
 * Detects and provides UI components for website-specific features
 */

import type { SidePanelFeature } from './types';
import { googleFormsFeature } from './google-forms';

export const features: SidePanelFeature[] = [
  googleFormsFeature,
  // Add more features here
];

export function detectFeatures(url: string): SidePanelFeature[] {
  if (!url) return [];
  return features.filter(feature => feature.detect(url));
}

export function getFeatureButton(url: string) {
  const detectedFeatures = detectFeatures(url);
  return detectedFeatures.length > 0 ? detectedFeatures[0].button : null;
}
