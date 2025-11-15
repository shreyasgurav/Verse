/**
 * Universal Forms Feature Configuration
 * Works on any website with forms
 */

import type { WebsiteFeature } from '../shared/types';
import { init } from './formFiller';

export const universalFormsFeature: WebsiteFeature = {
  name: 'universal-forms',
  urlPattern: /.*/, // Matches all URLs
  init,
};
