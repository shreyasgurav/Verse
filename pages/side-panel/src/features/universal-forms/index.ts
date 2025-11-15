/**
 * Universal Forms Side Panel Feature
 */

import type { SidePanelFeature } from '../types';
import FormFillButton from '../google-forms/FormFillButton'; // Reuse the same button

export const universalFormsFeature: SidePanelFeature = {
  name: 'universal-forms',
  urlPattern: /.*/, // Matches all URLs
  button: FormFillButton,
  detect: (url: string) => {
    // Show on all pages except special Chrome pages
    return (
      !url.startsWith('chrome://') && !url.startsWith('chrome-extension://') && !url.startsWith('about:') && url !== ''
    );
  },
};
