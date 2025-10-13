/**
 * Verification system for action results
 * Verifies that actions have achieved their intended outcomes
 */

const CONFIG = require('../../config/index.js');
const { VerificationResult, VERIFICATION_METHODS } = require('../../types/index.js');
const Logger = require('../../utils/logging/Logger.js').Logger;

class Verifier {
  constructor(cdpService) {
    this.cdpService = cdpService;
    this.logger = new Logger('Verifier');
  }

  /**
   * Verify action result using specified method
   */
  async verify(method, expected, currentState = null) {
    try {
      this.logger.debug(`Verifying with method: ${method}`, { expected });

      switch (method) {
        case VERIFICATION_METHODS.DOM_CHANGE:
          return await this.verifyDOMChange(expected);
          
        case VERIFICATION_METHODS.URL_CHANGE:
          return await this.verifyURLChange(expected);
          
        case VERIFICATION_METHODS.TEXT_PRESENT:
          return await this.verifyTextPresent(expected);
          
        case VERIFICATION_METHODS.ELEMENT_VISIBLE:
          return await this.verifyElementVisible(expected);
          
        case VERIFICATION_METHODS.VISUAL_DIFF:
          return await this.verifyVisualDiff(expected, currentState);
          
        default:
          throw new Error(`Unknown verification method: ${method}`);
      }
    } catch (error) {
      this.logger.error('Verification failed:', error);
      return new VerificationResult({
        passed: false,
        method,
        expected,
        actual: null,
        confidence: 0,
        details: error.message
      });
    }
  }

  /**
   * Verify DOM change occurred
   */
  async verifyDOMChange(expected) {
    try {
      const { selector, attribute, value, shouldExist = true } = expected;
      
      if (!selector) {
        throw new Error('Selector required for DOM change verification');
      }

      const elements = await this.cdpService.findElements(selector);
      const exists = elements.length > 0;
      
      if (shouldExist && !exists) {
        return new VerificationResult({
          passed: false,
          method: VERIFICATION_METHODS.DOM_CHANGE,
          expected: 'element should exist',
          actual: 'element not found',
          confidence: 1.0,
          details: `Element with selector "${selector}" was not found`
        });
      }

      if (!shouldExist && exists) {
        return new VerificationResult({
          passed: false,
          method: VERIFICATION_METHODS.DOM_CHANGE,
          expected: 'element should not exist',
          actual: 'element found',
          confidence: 1.0,
          details: `Element with selector "${selector}" was found but should not exist`
        });
      }

      // Check attribute value if specified
      if (attribute && value && exists) {
        const element = elements[0];
        const actualValue = element.attributes[attribute];
        
        if (actualValue !== value) {
          return new VerificationResult({
            passed: false,
            method: VERIFICATION_METHODS.DOM_CHANGE,
            expected: `${attribute}="${value}"`,
            actual: `${attribute}="${actualValue}"`,
            confidence: 0.8,
            details: `Attribute ${attribute} has value "${actualValue}" but expected "${value}"`
          });
        }
      }

      return new VerificationResult({
        passed: true,
        method: VERIFICATION_METHODS.DOM_CHANGE,
        expected,
        actual: exists ? 'element exists' : 'element does not exist',
        confidence: 1.0,
        details: 'DOM change verification passed'
      });
    } catch (error) {
      this.logger.error('DOM change verification failed:', error);
      throw error;
    }
  }

  /**
   * Verify URL change occurred
   */
  async verifyURLChange(expected) {
    try {
      const currentUrl = await this.cdpService.getCurrentUrl();
      
      if (expected.pattern) {
        const regex = new RegExp(expected.pattern);
        const matches = regex.test(currentUrl);
        
        return new VerificationResult({
          passed: matches,
          method: VERIFICATION_METHODS.URL_CHANGE,
          expected: `URL matching pattern: ${expected.pattern}`,
          actual: currentUrl,
          confidence: matches ? 1.0 : 0,
          details: matches ? 'URL pattern matched' : 'URL pattern did not match'
        });
      }
      
      if (expected.url) {
        const matches = currentUrl === expected.url;
        
        return new VerificationResult({
          passed: matches,
          method: VERIFICATION_METHODS.URL_CHANGE,
          expected: expected.url,
          actual: currentUrl,
          confidence: matches ? 1.0 : 0,
          details: matches ? 'URL matches exactly' : 'URL does not match'
        });
      }
      
      if (expected.contains) {
        const contains = currentUrl.includes(expected.contains);
        
        return new VerificationResult({
          passed: contains,
          method: VERIFICATION_METHODS.URL_CHANGE,
          expected: `URL containing: ${expected.contains}`,
          actual: currentUrl,
          confidence: contains ? 1.0 : 0,
          details: contains ? 'URL contains expected text' : 'URL does not contain expected text'
        });
      }

      throw new Error('Invalid URL change verification parameters');
    } catch (error) {
      this.logger.error('URL change verification failed:', error);
      throw error;
    }
  }

  /**
   * Verify text is present on page
   */
  async verifyTextPresent(expected) {
    try {
      const { text, selector = 'body', exact = false } = expected;
      
      if (!text) {
        throw new Error('Text required for text present verification');
      }

      const result = await this.cdpService.evaluate(`
        (function() {
          const element = document.querySelector(${JSON.stringify(selector)});
          if (!element) return false;
          
          const elementText = element.innerText || element.textContent || '';
          
          ${exact 
            ? `return elementText.trim() === ${JSON.stringify(text)};`
            : `return elementText.includes(${JSON.stringify(text)});`
          }
        })()
      `);

      const isPresent = result.value;
      
      return new VerificationResult({
        passed: isPresent,
        method: VERIFICATION_METHODS.TEXT_PRESENT,
        expected: exact ? `exact text: "${text}"` : `text containing: "${text}"`,
        actual: isPresent ? 'text found' : 'text not found',
        confidence: isPresent ? 1.0 : 0,
        details: isPresent ? 'Expected text is present' : 'Expected text is not present'
      });
    } catch (error) {
      this.logger.error('Text present verification failed:', error);
      throw error;
    }
  }

  /**
   * Verify element is visible
   */
  async verifyElementVisible(expected) {
    try {
      const { selector, shouldBeVisible = true } = expected;
      
      if (!selector) {
        throw new Error('Selector required for element visible verification');
      }

      const elements = await this.cdpService.findElements(selector);
      
      if (elements.length === 0) {
        return new VerificationResult({
          passed: !shouldBeVisible,
          method: VERIFICATION_METHODS.ELEMENT_VISIBLE,
          expected: shouldBeVisible ? 'element should be visible' : 'element should not be visible',
          actual: 'element not found',
          confidence: shouldBeVisible ? 0 : 1.0,
          details: shouldBeVisible ? 'Element not found' : 'Element not found (as expected)'
        });
      }

      const element = elements[0];
      const isVisible = element.isVisible;
      
      return new VerificationResult({
        passed: shouldBeVisible ? isVisible : !isVisible,
        method: VERIFICATION_METHODS.ELEMENT_VISIBLE,
        expected: shouldBeVisible ? 'element should be visible' : 'element should not be visible',
        actual: isVisible ? 'element is visible' : 'element is not visible',
        confidence: 0.9,
        details: shouldBeVisible 
          ? (isVisible ? 'Element is visible' : 'Element is not visible')
          : (isVisible ? 'Element is visible (but should not be)' : 'Element is not visible (as expected)')
      });
    } catch (error) {
      this.logger.error('Element visible verification failed:', error);
      throw error;
    }
  }

  /**
   * Verify visual difference (placeholder for future implementation)
   */
  async verifyVisualDiff(expected, currentState) {
    try {
      // This would involve taking screenshots and comparing them
      // For now, return a placeholder implementation
      this.logger.warn('Visual diff verification not yet implemented');
      
      return new VerificationResult({
        passed: true,
        method: VERIFICATION_METHODS.VISUAL_DIFF,
        expected,
        actual: 'visual diff verification skipped',
        confidence: 0.5,
        details: 'Visual diff verification not implemented'
      });
    } catch (error) {
      this.logger.error('Visual diff verification failed:', error);
      throw error;
    }
  }

  /**
   * Wait for condition to be met
   */
  async waitForCondition(verificationMethod, expected, timeout = CONFIG.VERIFICATION.TIMEOUT) {
    try {
      const startTime = Date.now();
      
      while (Date.now() - startTime < timeout) {
        const result = await this.verify(verificationMethod, expected);
        
        if (result.passed) {
          return result;
        }
        
        await new Promise(resolve => setTimeout(resolve, CONFIG.VERIFICATION.POLL_INTERVAL));
      }
      
      throw new Error(`Condition not met within timeout of ${timeout}ms`);
    } catch (error) {
      this.logger.error('Wait for condition failed:', error);
      throw error;
    }
  }

  /**
   * Verify multiple conditions
   */
  async verifyMultiple(conditions) {
    try {
      const results = [];
      
      for (const condition of conditions) {
        const result = await this.verify(condition.method, condition.expected);
        results.push(result);
        
        if (!result.passed) {
          break; // Stop on first failure
        }
      }
      
      const allPassed = results.every(result => result.passed);
      
      return new VerificationResult({
        passed: allPassed,
        method: 'multiple',
        expected: `${conditions.length} conditions`,
        actual: `${results.filter(r => r.passed).length}/${results.length} passed`,
        confidence: allPassed ? 1.0 : 0.5,
        details: results.map((r, i) => `Condition ${i + 1}: ${r.passed ? 'PASS' : 'FAIL'}`).join(', ')
      });
    } catch (error) {
      this.logger.error('Multiple verification failed:', error);
      throw error;
    }
  }
}

module.exports = Verifier;
