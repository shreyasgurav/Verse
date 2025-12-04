/**
 * Side Panel Feature Types
 */

import type React from 'react';

export interface TabMeta {
  title: string;
  icon?: string;
  url?: string;
}

export interface FeatureButtonProps {
  tabId: number;
  tabMeta: TabMeta;
  isDarkMode: boolean;
  onFillForm?: () => void;
  onStopFillForm?: () => void;
  disabled?: boolean;
}

export interface SidePanelFeature {
  name: string;
  urlPattern: RegExp;
  button?: React.ComponentType<FeatureButtonProps>;
  detect: (url: string) => boolean;
}
