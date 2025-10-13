/**
 * Core types and interfaces for the Agentic Browser
 * Production-level type definitions for the agentic browser system
 */

// Action Types
const ACTION_TYPES = {
  NAVIGATE: 'navigate',
  CLICK: 'click',
  TYPE: 'type',
  SCROLL: 'scroll',
  WAIT: 'wait',
  VERIFY: 'verify',
  EVALUATE: 'evaluate'
};

// Verification Methods
export const VERIFICATION_METHODS = {
  DOM_CHANGE: 'dom_change',
  URL_CHANGE: 'url_change',
  TEXT_PRESENT: 'text_present',
  ELEMENT_VISIBLE: 'element_visible',
  VISUAL_DIFF: 'visual_diff'
};

// Selector Strategies
export const SELECTOR_STRATEGIES = {
  DATA_ATTRIBUTE: 'data_attribute',
  ID: 'id',
  CSS_SELECTOR: 'css_selector',
  XPATH: 'xpath',
  ACCESSIBILITY: 'accessibility',
  VISUAL: 'visual'
};

// Task Status
export const TASK_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  FAILED: 'failed',
  RETRYING: 'retrying'
};

/**
 * Task Definition
 */
export class Task {
  constructor({
    id,
    action,
    args = {},
    selector = null,
    verification = null,
    retryCount = 0,
    maxRetries = 3,
    timeout = 30000,
    priority = 0
  }) {
    this.id = id || `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.action = action;
    this.args = args;
    this.selector = selector;
    this.verification = verification;
    this.retryCount = retryCount;
    this.maxRetries = maxRetries;
    this.timeout = timeout;
    this.priority = priority;
    this.status = TASK_STATUS.PENDING;
    this.createdAt = new Date();
    this.startedAt = null;
    this.completedAt = null;
    this.error = null;
    this.result = null;
  }
}

/**
 * Action Plan
 */
export class ActionPlan {
  constructor({
    id,
    goal,
    steps = [],
    context = {},
    estimatedDuration = null
  }) {
    this.id = id || `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.goal = goal;
    this.steps = steps;
    this.context = context;
    this.estimatedDuration = estimatedDuration;
    this.status = TASK_STATUS.PENDING;
    this.createdAt = new Date();
    this.currentStepIndex = 0;
  }
}

/**
 * Page State
 */
export class PageState {
  constructor({
    url,
    title,
    domSnapshot = null,
    accessibilityTree = null,
    screenshot = null,
    cookies = [],
    localStorage = {},
    sessionStorage = {},
    viewport = {},
    timestamp = new Date()
  }) {
    this.url = url;
    this.title = title;
    this.domSnapshot = domSnapshot;
    this.accessibilityTree = accessibilityTree;
    this.screenshot = screenshot;
    this.cookies = cookies;
    this.localStorage = localStorage;
    this.sessionStorage = sessionStorage;
    this.viewport = viewport;
    this.timestamp = timestamp;
  }
}

/**
 * Element Information
 */
export class ElementInfo {
  constructor({
    selector,
    tagName,
    textContent,
    innerHTML,
    attributes = {},
    boundingBox = {},
    isVisible = true,
    isClickable = false,
    isInput = false,
    accessibilityInfo = {}
  }) {
    this.selector = selector;
    this.tagName = tagName;
    this.textContent = textContent;
    this.innerHTML = innerHTML;
    this.attributes = attributes;
    this.boundingBox = boundingBox;
    this.isVisible = isVisible;
    this.isClickable = isClickable;
    this.isInput = isInput;
    this.accessibilityInfo = accessibilityInfo;
  }
}

/**
 * Action Result
 */
export class ActionResult {
  constructor({
    success,
    action,
    result = null,
    error = null,
    verification = null,
    duration = 0,
    timestamp = new Date()
  }) {
    this.success = success;
    this.action = action;
    this.result = result;
    this.error = error;
    this.verification = verification;
    this.duration = duration;
    this.timestamp = timestamp;
  }
}

/**
 * Verification Result
 */
export class VerificationResult {
  constructor({
    passed,
    method,
    expected,
    actual,
    confidence = 1.0,
    details = {}
  }) {
    this.passed = passed;
    this.method = method;
    this.expected = expected;
    this.actual = actual;
    this.confidence = confidence;
    this.details = details;
  }
}

/**
 * Selector Candidate
 */
export class SelectorCandidate {
  constructor({
    selector,
    strategy,
    confidence = 1.0,
    element = null,
    isUnique = false,
    isVisible = false,
    boundingBox = null
  }) {
    this.selector = selector;
    this.strategy = strategy;
    this.confidence = confidence;
    this.element = element;
    this.isUnique = isUnique;
    this.isVisible = isVisible;
    this.boundingBox = boundingBox;
  }
}

module.exports = {
  ACTION_TYPES,
  VERIFICATION_METHODS,
  SELECTOR_STRATEGIES,
  TASK_STATUS,
  Task,
  ActionPlan,
  PageState,
  ElementInfo,
  ActionResult,
  VerificationResult,
  SelectorCandidate
};
