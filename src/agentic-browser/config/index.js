/**
 * Configuration for the Agentic Browser
 * Production-level configuration management
 */

const { ACTION_TYPES, VERIFICATION_METHODS, SELECTOR_STRATEGIES } = require('../types/index.js');

const CONFIG = {
  // LLM Configuration
  LLM: {
    PROVIDER: process.env.LLM_PROVIDER || 'openai',
    MODEL: process.env.LLM_MODEL || 'gpt-4',
    API_KEY: process.env.OPENAI_API_KEY,
    MAX_TOKENS: 4000,
    TEMPERATURE: 0.1,
    TIMEOUT: 30000,
    MAX_RETRIES: 3
  },

  // CDP Configuration
  CDP: {
    VERSION: '1.3',
    TIMEOUT: 30000,
    MAX_RETRIES: 3,
    POLL_INTERVAL: 100,
    WAIT_FOR_LOAD_TIMEOUT: 10000
  },

  // Action Configuration
  ACTIONS: {
    DEFAULT_TIMEOUT: 30000,
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000,
    CLICK_DELAY: 500,
    TYPE_DELAY: 100,
    SCROLL_DELAY: 300
  },

  // Selector Configuration
  SELECTORS: {
    STRATEGIES: [
      SELECTOR_STRATEGIES.DATA_ATTRIBUTE,
      SELECTOR_STRATEGIES.ID,
      SELECTOR_STRATEGIES.CSS_SELECTOR,
      SELECTOR_STRATEGIES.XPATH,
      SELECTOR_STRATEGIES.ACCESSIBILITY,
      SELECTOR_STRATEGIES.VISUAL
    ],
    PRIORITY_ATTRIBUTES: [
      'data-testid',
      'data-test',
      'data-cy',
      'data-qa',
      'id',
      'name',
      'aria-label',
      'title'
    ],
    MIN_CONFIDENCE: 0.7,
    MAX_CANDIDATES: 10
  },

  // Verification Configuration
  VERIFICATION: {
    DEFAULT_METHOD: VERIFICATION_METHODS.DOM_CHANGE,
    TIMEOUT: 5000,
    POLL_INTERVAL: 200,
    METHODS: [
      VERIFICATION_METHODS.DOM_CHANGE,
      VERIFICATION_METHODS.URL_CHANGE,
      VERIFICATION_METHODS.TEXT_PRESENT,
      VERIFICATION_METHODS.ELEMENT_VISIBLE,
      VERIFICATION_METHODS.VISUAL_DIFF
    ]
  },

  // Logging Configuration
  LOGGING: {
    LEVEL: process.env.LOG_LEVEL || 'info',
    ENABLE_CDP_LOGS: process.env.ENABLE_CDP_LOGS === 'true',
    ENABLE_SCREENSHOTS: process.env.ENABLE_SCREENSHOTS === 'true',
    SCREENSHOT_DIR: './logs/screenshots',
    LOG_DIR: './logs'
  },

  // Safety Configuration
  SAFETY: {
    MAX_ACTIONS_PER_MINUTE: 60,
    BLOCKED_DOMAINS: [],
    ALLOWED_DOMAINS: [],
    MAX_EXECUTION_TIME: 300000, // 5 minutes
    SANDBOX_MODE: process.env.SANDBOX_MODE === 'true',
    RATE_LIMIT_ENABLED: true
  },

  // Visual Processing Configuration
  VISUAL: {
    ENABLE_OCR: true,
    ENABLE_IMAGE_MATCHING: true,
    OCR_LANGUAGE: 'eng',
    SCREENSHOT_QUALITY: 80,
    TEMPLATE_MATCHING_THRESHOLD: 0.8,
    OCR_CONFIDENCE_THRESHOLD: 0.7
  },

  // Browser Configuration
  BROWSER: {
    WINDOW_WIDTH: 1200,
    WINDOW_HEIGHT: 800,
    USER_AGENT: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    VIEWPORT: {
      width: 1200,
      height: 800,
      deviceScaleFactor: 1
    }
  }
};

// Environment-specific overrides
if (process.env.NODE_ENV === 'development') {
  CONFIG.LOGGING.LEVEL = 'debug';
  CONFIG.LOGGING.ENABLE_SCREENSHOTS = true;
  CONFIG.SAFETY.SANDBOX_MODE = true;
}

if (process.env.NODE_ENV === 'production') {
  CONFIG.LOGGING.LEVEL = 'warn';
  CONFIG.LOGGING.ENABLE_SCREENSHOTS = false;
  CONFIG.SAFETY.SANDBOX_MODE = false;
  CONFIG.ACTIONS.MAX_RETRIES = 2;
}

module.exports = CONFIG;
