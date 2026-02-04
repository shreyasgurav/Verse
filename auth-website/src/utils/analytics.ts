import { logEvent, setUserId, setUserProperties } from 'firebase/analytics';
import { analytics } from '../firebase';

// Analytics utility functions for tracking user interactions
export const Analytics = {
  // Track page views
  trackPageView: (pageName: string, pageTitle?: string) => {
    logEvent(analytics, 'page_view', {
      page_title: pageTitle || pageName,
      page_location: window.location.href,
      page_path: window.location.pathname,
    });
  },

  // Track authentication events
  trackSignIn: (method: string = 'google') => {
    logEvent(analytics, 'login', {
      method: method,
    });
  },

  trackSignUp: (method: string = 'google') => {
    logEvent(analytics, 'sign_up', {
      method: method,
    });
  },

  trackSignOut: () => {
    logEvent(analytics, 'logout');
  },

  // Track user properties
  setUser: (userId: string, userProperties?: { [key: string]: any }) => {
    setUserId(analytics, userId);
    if (userProperties) {
      setUserProperties(analytics, userProperties);
    }
  },

  // Track custom events
  trackEvent: (eventName: string, parameters?: { [key: string]: any }) => {
    logEvent(analytics, eventName, parameters);
  },

  // Enhanced button click tracking with detailed metrics
  trackButtonClick: (buttonName: string, location?: string, additionalData?: { [key: string]: any }) => {
    const eventData = {
      button_name: buttonName,
      button_location: location || window.location.pathname,
      page_url: window.location.href,
      page_title: document.title,
      timestamp: new Date().toISOString(),
      user_agent: navigator.userAgent,
      screen_resolution: `${screen.width}x${screen.height}`,
      viewport_size: `${window.innerWidth}x${window.innerHeight}`,
      referrer: document.referrer || 'direct',
      session_id: sessionStorage.getItem('analytics_session_id') || Analytics.generateSessionId(),
      ...additionalData,
    };

    // Store session ID if not exists
    if (!sessionStorage.getItem('analytics_session_id')) {
      sessionStorage.setItem('analytics_session_id', eventData.session_id);
    }

    // Track the enhanced button click event
    logEvent(analytics, 'button_click', eventData);

    // Also track a simplified version for easier querying
    logEvent(analytics, 'button_interaction', {
      button_id: buttonName.toLowerCase().replace(/\s+/g, '_'),
      button_text: buttonName,
      location: location || window.location.pathname,
      click_count: Analytics.incrementButtonClickCount(buttonName),
    });
  },

  // Generate unique session ID
  generateSessionId: () => {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  },

  // Track button click counts locally for session analytics
  incrementButtonClickCount: (buttonName: string) => {
    const key = `button_clicks_${buttonName.toLowerCase().replace(/\s+/g, '_')}`;
    const currentCount = parseInt(localStorage.getItem(key) || '0');
    const newCount = currentCount + 1;
    localStorage.setItem(key, newCount.toString());
    return newCount;
  },

  // Get button click statistics
  getButtonClickStats: () => {
    const stats: { [key: string]: number } = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('button_clicks_')) {
        const buttonName = key.replace('button_clicks_', '').replace(/_/g, ' ');
        stats[buttonName] = parseInt(localStorage.getItem(key) || '0');
      }
    }
    return stats;
  },

  // Track button hover events
  trackButtonHover: (buttonName: string, location?: string) => {
    logEvent(analytics, 'button_hover', {
      button_name: buttonName,
      location: location || window.location.pathname,
      hover_timestamp: new Date().toISOString(),
    });
  },

  // Track CTA performance
  trackCTAPerformance: (ctaName: string, action: 'view' | 'click' | 'hover', location?: string) => {
    logEvent(analytics, 'cta_performance', {
      cta_name: ctaName,
      cta_action: action,
      location: location || window.location.pathname,
      timestamp: new Date().toISOString(),
    });
  },

  // Track auth flow events
  trackAuthStart: () => {
    logEvent(analytics, 'auth_start');
  },

  trackAuthSuccess: (userId: string, email: string, name: string) => {
    logEvent(analytics, 'auth_success', {
      user_id: userId,
      user_email: email,
      user_name: name,
    });
    // Set user properties for analytics
    Analytics.setUser(userId, {
      email: email,
      name: name,
      sign_in_method: 'google',
    });
  },

  trackAuthError: (error: string) => {
    logEvent(analytics, 'auth_error', {
      error_message: error,
    });
  },

  // Track extension-related events
  trackExtensionMessage: (messageType: string, success: boolean) => {
    logEvent(analytics, 'extension_message', {
      message_type: messageType,
      success: success,
    });
  },

  trackRedirect: (destination: string) => {
    logEvent(analytics, 'redirect', {
      destination: destination,
    });
  },
};

export default Analytics;
