/**
 * Chrome DevTools Protocol Service
 * Core service for interacting with the browser via CDP
 */

const CONFIG = require('../../config/index.js');
const { PageState, ElementInfo, ActionResult } = require('../../types/index.js');
const Logger = require('../../utils/logging/Logger.js').Logger;

class CDPService {
  constructor(webContents) {
    this.webContents = webContents;
    this.logger = new Logger('CDPService');
    this.isAttached = false;
    this.commandQueue = [];
    this.isProcessing = false;
  }

  /**
   * Initialize CDP connection
   */
  async initialize() {
    try {
      if (!this.isAttached) {
        this.webContents.debugger.attach(CONFIG.CDP.VERSION);
        this.isAttached = true;
        this.logger.info('CDP debugger attached successfully');
      }

      // Enable required domains
      await this.enableDomains();
      
      // Set up error handling
      this.webContents.debugger.on('detach', () => {
        this.isAttached = false;
        this.logger.warn('CDP debugger detached');
      });

      return true;
    } catch (error) {
      this.logger.error('Failed to initialize CDP:', error);
      throw error;
    }
  }

  /**
   * Enable required CDP domains
   */
  async enableDomains() {
    const domains = [
      'DOM',
      'Runtime',
      'Page',
      'Network',
      'Input',
      'Accessibility',
      'CSS'
    ];

    for (const domain of domains) {
      try {
        await this.sendCommand(`${domain}.enable`);
        this.logger.debug(`Enabled ${domain} domain`);
      } catch (error) {
        this.logger.warn(`Failed to enable ${domain} domain:`, error);
      }
    }
  }

  /**
   * Send CDP command with retry logic
   */
  async sendCommand(method, params = {}, retries = CONFIG.CDP.MAX_RETRIES) {
    return new Promise((resolve, reject) => {
      const attempt = (retryCount) => {
        this.webContents.debugger.sendCommand(method, params, (error, result) => {
          if (error) {
            if (retryCount > 0) {
              this.logger.warn(`CDP command failed, retrying (${retryCount} attempts left):`, method, error);
              setTimeout(() => attempt(retryCount - 1), CONFIG.ACTIONS.RETRY_DELAY);
            } else {
              this.logger.error(`CDP command failed after all retries:`, method, error);
              reject(error);
            }
          } else {
            this.logger.debug(`CDP command successful:`, method);
            resolve(result);
          }
        });
      };

      attempt(retries);
    });
  }

  /**
   * Get current page state
   */
  async getPageState() {
    try {
      const [url, title, document, cookies, storage] = await Promise.all([
        this.getCurrentUrl(),
        this.getPageTitle(),
        this.getDocumentSnapshot(),
        this.getCookies(),
        this.getStorageData()
      ]);

      const viewport = await this.getViewport();
      const accessibilityTree = await this.getAccessibilityTree();

      return new PageState({
        url,
        title,
        domSnapshot: document,
        accessibilityTree,
        cookies,
        localStorage: storage.localStorage,
        sessionStorage: storage.sessionStorage,
        viewport,
        timestamp: new Date()
      });
    } catch (error) {
      this.logger.error('Failed to get page state:', error);
      throw error;
    }
  }

  /**
   * Get current URL
   */
  async getCurrentUrl() {
    const result = await this.sendCommand('Runtime.evaluate', {
      expression: 'window.location.href',
      returnByValue: true
    });
    return result.result.value;
  }

  /**
   * Get page title
   */
  async getPageTitle() {
    const result = await this.sendCommand('Runtime.evaluate', {
      expression: 'document.title',
      returnByValue: true
    });
    return result.result.value;
  }

  /**
   * Get document snapshot
   */
  async getDocumentSnapshot() {
    const document = await this.sendCommand('DOM.getDocument', { depth: 2 });
    return document;
  }

  /**
   * Get accessibility tree
   */
  async getAccessibilityTree() {
    try {
      const tree = await this.sendCommand('Accessibility.getFullAXTree');
      return tree;
    } catch (error) {
      this.logger.warn('Failed to get accessibility tree:', error);
      return null;
    }
  }

  /**
   * Get cookies
   */
  async getCookies() {
    try {
      const cookies = await this.sendCommand('Network.getCookies');
      return cookies.cookies || [];
    } catch (error) {
      this.logger.warn('Failed to get cookies:', error);
      return [];
    }
  }

  /**
   * Get storage data
   */
  async getStorageData() {
    try {
      const [localStorage, sessionStorage] = await Promise.all([
        this.sendCommand('Runtime.evaluate', {
          expression: 'JSON.stringify(localStorage)',
          returnByValue: true
        }).catch(() => ({ result: { value: '{}' } })),
        this.sendCommand('Runtime.evaluate', {
          expression: 'JSON.stringify(sessionStorage)',
          returnByValue: true
        }).catch(() => ({ result: { value: '{}' } }))
      ]);

      return {
        localStorage: JSON.parse(localStorage.result.value || '{}'),
        sessionStorage: JSON.parse(sessionStorage.result.value || '{}')
      };
    } catch (error) {
      this.logger.warn('Failed to get storage data:', error);
      return { localStorage: {}, sessionStorage: {} };
    }
  }

  /**
   * Get viewport information
   */
  async getViewport() {
    try {
      const result = await this.sendCommand('Runtime.evaluate', {
        expression: `
          ({
            width: window.innerWidth,
            height: window.innerHeight,
            scrollX: window.scrollX,
            scrollY: window.scrollY
          })
        `,
        returnByValue: true
      });
      return result.result.value;
    } catch (error) {
      this.logger.warn('Failed to get viewport:', error);
      return { width: 1200, height: 800, scrollX: 0, scrollY: 0 };
    }
  }

  /**
   * Find elements by selector
   */
  async findElements(selector) {
    try {
      const result = await this.sendCommand('Runtime.evaluate', {
        expression: `
          (function() {
            const elements = Array.from(document.querySelectorAll(${JSON.stringify(selector)}));
            return elements.map(el => ({
              tagName: el.tagName,
              textContent: el.textContent?.trim(),
              innerHTML: el.innerHTML,
              attributes: Array.from(el.attributes).reduce((acc, attr) => {
                acc[attr.name] = attr.value;
                return acc;
              }, {}),
              boundingBox: el.getBoundingClientRect(),
              isVisible: el.offsetParent !== null && 
                        window.getComputedStyle(el).visibility !== 'hidden' &&
                        window.getComputedStyle(el).display !== 'none',
              isClickable: ['A', 'BUTTON', 'INPUT'].includes(el.tagName) || 
                          el.onclick || 
                          el.getAttribute('role') === 'button' ||
                          el.style.cursor === 'pointer',
              isInput: ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)
            }));
          })()
        `,
        returnByValue: true
      });

      return result.result.value.map(info => new ElementInfo(info));
    } catch (error) {
      this.logger.error(`Failed to find elements with selector "${selector}":`, error);
      return [];
    }
  }

  /**
   * Navigate to URL
   */
  async navigate(url) {
    const startTime = Date.now();
    try {
      this.logger.info(`Navigating to: ${url}`);
      
      await this.sendCommand('Page.navigate', { url });
      
      // Wait for navigation to complete
      await this.waitForLoad();
      
      const duration = Date.now() - startTime;
      return new ActionResult({
        success: true,
        action: 'navigate',
        result: { url },
        duration
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`Navigation failed:`, error);
      return new ActionResult({
        success: false,
        action: 'navigate',
        error: error.message,
        duration
      });
    }
  }

  /**
   * Click element
   */
  async clickElement(selector, coordinates = null) {
    const startTime = Date.now();
    try {
      this.logger.info(`Clicking element: ${selector}`);
      
      let clickCoords;
      
      if (coordinates) {
        clickCoords = coordinates;
      } else {
        // Get element coordinates
        const result = await this.sendCommand('Runtime.evaluate', {
          expression: `
            (function() {
              const el = document.querySelector(${JSON.stringify(selector)});
              if (!el) throw new Error('Element not found');
              
              el.scrollIntoView({ block: 'center', inline: 'center' });
              const rect = el.getBoundingClientRect();
              return {
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2
              };
            })()
          `,
          returnByValue: true
        });
        
        clickCoords = result.result.value;
      }

      // Perform click using mouse events
      await this.sendCommand('Input.dispatchMouseEvent', {
        type: 'mousePressed',
        button: 'left',
        x: clickCoords.x,
        y: clickCoords.y,
        clickCount: 1
      });

      await new Promise(resolve => setTimeout(resolve, CONFIG.ACTIONS.CLICK_DELAY));

      await this.sendCommand('Input.dispatchMouseEvent', {
        type: 'mouseReleased',
        button: 'left',
        x: clickCoords.x,
        y: clickCoords.y,
        clickCount: 1
      });

      const duration = Date.now() - startTime;
      return new ActionResult({
        success: true,
        action: 'click',
        result: { selector, coordinates: clickCoords },
        duration
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`Click failed:`, error);
      return new ActionResult({
        success: false,
        action: 'click',
        error: error.message,
        duration
      });
    }
  }

  /**
   * Type text into element
   */
  async typeText(selector, text) {
    const startTime = Date.now();
    try {
      this.logger.info(`Typing text into: ${selector}`);
      
      // Focus element and clear existing content
      await this.sendCommand('Runtime.evaluate', {
        expression: `
          (function() {
            const el = document.querySelector(${JSON.stringify(selector)});
            if (!el) throw new Error('Element not found');
            
            el.focus();
            el.select();
            el.value = '';
          })()
        `
      });

      // Type text character by character
      for (const char of text) {
        await this.sendCommand('Input.dispatchKeyEvent', {
          type: 'char',
          text: char
        });
        await new Promise(resolve => setTimeout(resolve, CONFIG.ACTIONS.TYPE_DELAY));
      }

      // Trigger input events
      await this.sendCommand('Runtime.evaluate', {
        expression: `
          (function() {
            const el = document.querySelector(${JSON.stringify(selector)});
            if (el) {
              el.dispatchEvent(new Event('input', { bubbles: true }));
              el.dispatchEvent(new Event('change', { bubbles: true }));
            }
          })()
        `
      });

      const duration = Date.now() - startTime;
      return new ActionResult({
        success: true,
        action: 'type',
        result: { selector, text },
        duration
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`Type failed:`, error);
      return new ActionResult({
        success: false,
        action: 'type',
        error: error.message,
        duration
      });
    }
  }

  /**
   * Scroll page
   */
  async scroll(direction, amount = 300) {
    const startTime = Date.now();
    try {
      this.logger.info(`Scrolling ${direction} by ${amount}px`);
      
      const scrollExpression = direction === 'down' 
        ? `window.scrollBy(0, ${amount})`
        : direction === 'up'
        ? `window.scrollBy(0, -${amount})`
        : direction === 'left'
        ? `window.scrollBy(-${amount}, 0)`
        : `window.scrollBy(${amount}, 0)`;

      await this.sendCommand('Runtime.evaluate', {
        expression: scrollExpression
      });

      await new Promise(resolve => setTimeout(resolve, CONFIG.ACTIONS.SCROLL_DELAY));

      const duration = Date.now() - startTime;
      return new ActionResult({
        success: true,
        action: 'scroll',
        result: { direction, amount },
        duration
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`Scroll failed:`, error);
      return new ActionResult({
        success: false,
        action: 'scroll',
        error: error.message,
        duration
      });
    }
  }

  /**
   * Wait for page load
   */
  async waitForLoad() {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Page load timeout'));
      }, CONFIG.CDP.WAIT_FOR_LOAD_TIMEOUT);

      const checkLoadState = async () => {
        try {
          const result = await this.sendCommand('Runtime.evaluate', {
            expression: 'document.readyState',
            returnByValue: true
          });
          
          if (result.result.value === 'complete') {
            clearTimeout(timeout);
            resolve();
          } else {
            setTimeout(checkLoadState, CONFIG.CDP.POLL_INTERVAL);
          }
        } catch (error) {
          clearTimeout(timeout);
          reject(error);
        }
      };

      checkLoadState();
    });
  }

  /**
   * Take screenshot
   */
  async takeScreenshot(format = 'png') {
    try {
      const result = await this.sendCommand('Page.captureScreenshot', {
        format,
        quality: CONFIG.VISUAL.SCREENSHOT_QUALITY
      });
      return result.data;
    } catch (error) {
      this.logger.error('Failed to take screenshot:', error);
      throw error;
    }
  }

  /**
   * Execute JavaScript in page context
   */
  async evaluate(expression, returnByValue = true) {
    try {
      const result = await this.sendCommand('Runtime.evaluate', {
        expression,
        returnByValue
      });
      return result.result;
    } catch (error) {
      this.logger.error('Failed to evaluate expression:', error);
      throw error;
    }
  }

  /**
   * Cleanup and detach
   */
  async cleanup() {
    try {
      if (this.isAttached) {
        this.webContents.debugger.detach();
        this.isAttached = false;
        this.logger.info('CDP debugger detached');
      }
    } catch (error) {
      this.logger.warn('Error during CDP cleanup:', error);
    }
  }
}

module.exports = CDPService;
