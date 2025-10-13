/**
 * Safety and security management system
 * Ensures safe execution of agentic browser actions
 */

const CONFIG = require('../../config/index.js');
const Logger = require('../logging/Logger.js').Logger;

class SafetyManager {
  constructor() {
    this.logger = new Logger('SafetyManager');
    this.actionCount = 0;
    this.startTime = Date.now();
    this.lastActionTime = Date.now();
    this.blockedDomains = new Set(CONFIG.SAFETY.BLOCKED_DOMAINS);
    this.allowedDomains = new Set(CONFIG.SAFETY.ALLOWED_DOMAINS);
  }

  /**
   * Initialize safety manager
   */
  async initialize() {
    this.logger.info('Safety Manager initialized');
    this.startTime = Date.now();
    this.actionCount = 0;
    return true;
  }

  /**
   * Validate user goal for safety
   */
  async validateGoal(goal, context = {}) {
    const errors = [];

    // Check for potentially malicious goals
    const maliciousPatterns = [
      /delete\s+account/i,
      /transfer\s+money/i,
      /withdraw\s+funds/i,
      /close\s+account/i,
      /change\s+password/i,
      /purchase\s+with\s+card/i,
      /enter\s+credit\s+card/i,
      /social\s+security/i,
      /ssn/i
    ];

    for (const pattern of maliciousPatterns) {
      if (pattern.test(goal)) {
        errors.push(`Goal contains potentially sensitive operation: ${pattern.source}`);
      }
    }

    // Check execution time limits
    if (CONFIG.SAFETY.MAX_EXECUTION_TIME) {
      const elapsed = Date.now() - this.startTime;
      if (elapsed > CONFIG.SAFETY.MAX_EXECUTION_TIME) {
        errors.push(`Maximum execution time exceeded: ${elapsed}ms`);
      }
    }

    // Check rate limiting
    if (CONFIG.SAFETY.RATE_LIMIT_ENABLED) {
      const timeSinceLastAction = Date.now() - this.lastActionTime;
      const actionsPerMinute = this.actionCount / ((Date.now() - this.startTime) / 60000);
      
      if (actionsPerMinute > CONFIG.SAFETY.MAX_ACTIONS_PER_MINUTE) {
        errors.push(`Action rate limit exceeded: ${actionsPerMinute} actions per minute`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate action plan for safety
   */
  validateActionPlan(plan) {
    const errors = [];

    // Check for dangerous actions
    const dangerousActions = plan.steps.filter(step => 
      this.isDangerousAction(step)
    );

    if (dangerousActions.length > 0) {
      errors.push(`Plan contains ${dangerousActions.length} potentially dangerous actions`);
    }

    // Check for blocked domains
    const navigationSteps = plan.steps.filter(step => step.action === 'navigate');
    for (const step of navigationSteps) {
      if (this.isBlockedDomain(step.args.url)) {
        errors.push(`Navigation to blocked domain: ${step.args.url}`);
      }
    }

    // Check for excessive resource usage
    const evaluateSteps = plan.steps.filter(step => step.action === 'evaluate');
    if (evaluateSteps.length > 10) {
      errors.push('Plan contains too many JavaScript evaluations');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate JavaScript code for safety
   */
  validateCode(code) {
    const errors = [];

    // Check for dangerous patterns
    const dangerousPatterns = [
      {
        pattern: /eval\s*\(/,
        message: 'eval() usage detected'
      },
      {
        pattern: /Function\s*\(/,
        message: 'Function constructor usage detected'
      },
      {
        pattern: /document\.write/,
        message: 'document.write usage detected'
      },
      {
        pattern: /window\.location\.href\s*=/,
        message: 'Direct URL manipulation detected'
      },
      {
        pattern: /localStorage\.clear/,
        message: 'localStorage.clear() usage detected'
      },
      {
        pattern: /sessionStorage\.clear/,
        message: 'sessionStorage.clear() usage detected'
      },
      {
        pattern: /XMLHttpRequest/,
        message: 'XMLHttpRequest usage detected'
      },
      {
        pattern: /fetch\s*\(/,
        message: 'fetch() usage detected'
      },
      {
        pattern: /setTimeout\s*\(/,
        message: 'setTimeout usage detected'
      },
      {
        pattern: /setInterval\s*\(/,
        message: 'setInterval usage detected'
      },
      {
        pattern: /import\s*\(/,
        message: 'Dynamic import usage detected'
      },
      {
        pattern: /require\s*\(/,
        message: 'require() usage detected'
      }
    ];

    for (const { pattern, message } of dangerousPatterns) {
      if (pattern.test(code)) {
        errors.push(message);
      }
    }

    // Check code length
    if (code.length > 10000) {
      errors.push('Code exceeds maximum length limit');
    }

    // Check for suspicious strings
    const suspiciousStrings = [
      'password',
      'credit card',
      'social security',
      'bank account',
      'ssn',
      'cvv',
      'pin'
    ];

    for (const suspicious of suspiciousStrings) {
      if (code.toLowerCase().includes(suspicious)) {
        errors.push(`Code contains suspicious string: ${suspicious}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Check if action is dangerous
   */
  isDangerousAction(step) {
    // Check for dangerous action types
    if (step.action === 'evaluate') {
      if (!step.args.code) return true;
      return !this.validateCode(step.args.code).isValid;
    }

    // Check for navigation to sensitive domains
    if (step.action === 'navigate') {
      return this.isBlockedDomain(step.args.url);
    }

    // Check for excessive retries
    if (step.retryCount > 10) {
      return true;
    }

    return false;
  }

  /**
   * Check if domain is blocked
   */
  isBlockedDomain(url) {
    try {
      const domain = new URL(url).hostname.toLowerCase();
      
      // Check blocked domains
      for (const blocked of this.blockedDomains) {
        if (domain.includes(blocked.toLowerCase()) || domain.endsWith(blocked.toLowerCase())) {
          return true;
        }
      }

      // If allowed domains are specified, check against them
      if (this.allowedDomains.size > 0) {
        let isAllowed = false;
        for (const allowed of this.allowedDomains) {
          if (domain.includes(allowed.toLowerCase()) || domain.endsWith(allowed.toLowerCase())) {
            isAllowed = true;
            break;
          }
        }
        return !isAllowed;
      }

      return false;
    } catch (error) {
      // Invalid URL is considered blocked
      return true;
    }
  }

  /**
   * Record action for rate limiting
   */
  recordAction() {
    this.actionCount++;
    this.lastActionTime = Date.now();
    
    // Reset counter every minute
    if (Date.now() - this.startTime > 60000) {
      this.startTime = Date.now();
      this.actionCount = 1;
    }
  }

  /**
   * Check if rate limit is exceeded
   */
  isRateLimited() {
    if (!CONFIG.SAFETY.RATE_LIMIT_ENABLED) {
      return false;
    }

    const actionsPerMinute = this.actionCount / ((Date.now() - this.startTime) / 60000);
    return actionsPerMinute > CONFIG.SAFETY.MAX_ACTIONS_PER_MINUTE;
  }

  /**
   * Get safety statistics
   */
  getStats() {
    const elapsed = Date.now() - this.startTime;
    const actionsPerMinute = this.actionCount / (elapsed / 60000);

    return {
      totalActions: this.actionCount,
      elapsedTime: elapsed,
      actionsPerMinute: Math.round(actionsPerMinute * 100) / 100,
      isRateLimited: this.isRateLimited(),
      blockedDomains: Array.from(this.blockedDomains),
      allowedDomains: Array.from(this.allowedDomains)
    };
  }

  /**
   * Add blocked domain
   */
  addBlockedDomain(domain) {
    this.blockedDomains.add(domain.toLowerCase());
    this.logger.info(`Added blocked domain: ${domain}`);
  }

  /**
   * Remove blocked domain
   */
  removeBlockedDomain(domain) {
    this.blockedDomains.delete(domain.toLowerCase());
    this.logger.info(`Removed blocked domain: ${domain}`);
  }

  /**
   * Add allowed domain
   */
  addAllowedDomain(domain) {
    this.allowedDomains.add(domain.toLowerCase());
    this.logger.info(`Added allowed domain: ${domain}`);
  }

  /**
   * Remove allowed domain
   */
  removeAllowedDomain(domain) {
    this.allowedDomains.delete(domain.toLowerCase());
    this.logger.info(`Removed allowed domain: ${domain}`);
  }

  /**
   * Sanitize input to prevent injection attacks
   */
  sanitizeInput(input) {
    if (typeof input !== 'string') {
      return input;
    }

    // Remove potentially dangerous characters
    return input
      .replace(/[<>\"']/g, '') // Remove HTML/JS injection characters
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/data:/gi, '') // Remove data: protocol
      .replace(/vbscript:/gi, '') // Remove vbscript: protocol
      .trim();
  }

  /**
   * Validate selector for safety
   */
  validateSelector(selector) {
    if (typeof selector !== 'string') {
      return { isValid: false, errors: ['Selector must be a string'] };
    }

    const errors = [];

    // Check for dangerous selectors
    const dangerousPatterns = [
      /script/i,
      /javascript:/i,
      /data:/i,
      /vbscript:/i
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(selector)) {
        errors.push(`Selector contains dangerous pattern: ${pattern.source}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    this.logger.info('Safety Manager cleanup completed');
  }
}

module.exports = SafetyManager;
