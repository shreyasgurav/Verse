/**
 * Google Forms Feature Configuration
 */

import type { WebsiteFeature } from '../shared/types';
import { init } from './formFiller';

export const googleFormsFeature: WebsiteFeature = {
  name: 'google-forms',
  urlPattern: /docs\.google\.com\/forms\//,
  init,
};
