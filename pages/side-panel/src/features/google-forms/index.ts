/**
 * Google Forms Side Panel Feature
 */

import type { SidePanelFeature } from '../types';
import FormFillButton from './FormFillButton';

export const googleFormsFeature: SidePanelFeature = {
  name: 'google-forms',
  urlPattern: /docs\.google\.com\/forms\//,
  button: FormFillButton,
  detect: (url: string) => /docs\.google\.com\/forms\//.test(url),
};
