/**
 * Enhanced Agentic Browser with State Observation and Complex Task Support
 * Handles multi-step tasks with state awareness and goal persistence
 */

const { ipcMain } = require('electron');

class EnhancedAgenticBrowser {
  constructor() {
    this.isExecuting = false;
    this.currentGoal = null;
    this.currentPlan = null;
    this.executionHistory = [];
    this.currentState = null;
    this.goalProgress = {
      currentPhase: 'initialization',
      completedSubGoals: [],
      remainingSubGoals: [],
      context: {}
    };
  }

  /**
   * Execute a complex user goal with state awareness
   */
  async executeGoal(goal, context = {}, webContents = null) {
    try {
      console.log(`🤖 Executing complex agentic goal: ${goal}`);
      
      if (this.isExecuting) {
        throw new Error('Another goal is currently being executed');
      }

      this.isExecuting = true;
      this.currentGoal = goal;
      
      // Create a comprehensive plan
      const plan = this.createComplexPlan(goal, context);
      this.currentPlan = plan;
      
      console.log(`📋 Generated complex plan with ${plan.steps.length} steps`);
      
      // Execute with state observation
      const result = await this.executeWithStateAwareness(plan, webContents);
      
      this.isExecuting = false;
      return result;
    } catch (error) {
      this.isExecuting = false;
      console.error('❌ Complex goal execution failed:', error);
      throw error;
    }
  }

  /**
   * Create a complex plan with sub-goals and state awareness
   */
  createComplexPlan(goal, context) {
    const steps = [];
    const goalLower = goal.toLowerCase();
    
    // Complex goal analysis
    if (goalLower.includes('find') && goalLower.includes('amazon') && goalLower.includes('cart')) {
      // Extract product name
      let productName = this.extractProductName(goal);
      
      // Phase 1: Navigate and Search
      steps.push({
        action: 'navigate',
        args: { url: 'https://amazon.com' },
        description: 'Navigate to Amazon',
        subGoal: 'navigation',
        expectedState: 'amazon_homepage'
      });
      
      steps.push({
        action: 'type',
        args: { 
          selector: '#twotabsearchtextbox',
          text: productName,
          fallbackSelectors: ['input[name="field-keywords"]', 'input[type="text"]']
        },
        description: `Search for ${productName}`,
        subGoal: 'search',
        expectedState: 'search_input_filled'
      });
      
      steps.push({
        action: 'click',
        args: { 
          selector: '#nav-search-submit-button',
          fallbackSelectors: ['input[type="submit"]', 'button[type="submit"]']
        },
        description: 'Submit search',
        subGoal: 'search',
        expectedState: 'search_results_page'
      });
      
      // Phase 2: Find and Select Product
      steps.push({
        action: 'observe_state',
        args: { 
          purpose: 'verify_search_results',
          expectedElements: ['[data-component-type="s-search-result"]', '.s-result-item'],
          timeout: 5000
        },
        description: 'Verify search results loaded',
        subGoal: 'product_discovery',
        expectedState: 'search_results_loaded'
      });
      
      steps.push({
        action: 'click',
        args: { 
          selector: '[data-component-type="s-search-result"] a',
          fallbackSelectors: ['.s-result-item a', 'a[href*="/dp/"]'],
          text: productName
        },
        description: `Click on ${productName} product`,
        subGoal: 'product_selection',
        expectedState: 'product_page'
      });
      
      // Phase 3: Add to Cart
      steps.push({
        action: 'observe_state',
        args: { 
          purpose: 'verify_product_page',
          expectedElements: ['#add-to-cart-button', '#addToCart', '[name="submit.add-to-cart"]'],
          timeout: 5000
        },
        description: 'Verify product page loaded',
        subGoal: 'cart_operation',
        expectedState: 'product_page_loaded'
      });
      
      steps.push({
        action: 'click',
        args: { 
          selector: '#add-to-cart-button',
          fallbackSelectors: ['#addToCart', '[name="submit.add-to-cart"]', 'input[value="Add to Cart"]'],
          text: 'Add to Cart'
        },
        description: 'Add product to cart',
        subGoal: 'cart_operation',
        expectedState: 'cart_updated'
      });
      
      // Phase 4: Verify Success
      steps.push({
        action: 'observe_state',
        args: { 
          purpose: 'verify_cart_addition',
          expectedElements: ['.sw-atc-text', '#sw-atc-details-single-container', '.a-alert-success'],
          timeout: 3000
        },
        description: 'Verify item added to cart',
        subGoal: 'verification',
        expectedState: 'cart_confirmation'
      });
      
    } else if (goalLower.includes('amazon') && goalLower.includes('search')) {
      // Simple search workflow
      const productName = this.extractProductName(goal) || 'product';
      
      steps.push({
        action: 'navigate',
        args: { url: 'https://amazon.com' },
        description: 'Navigate to Amazon',
        subGoal: 'navigation',
        expectedState: 'amazon_homepage'
      });
      
      steps.push({
        action: 'type',
        args: { 
          selector: '#twotabsearchtextbox',
          text: productName,
          fallbackSelectors: ['input[name="field-keywords"]', 'input[type="text"]']
        },
        description: `Search for ${productName}`,
        subGoal: 'search',
        expectedState: 'search_input_filled'
      });
      
      steps.push({
        action: 'click',
        args: { 
          selector: '#nav-search-submit-button',
          fallbackSelectors: ['input[type="submit"]', 'button[type="submit"]']
        },
        description: 'Submit search',
        subGoal: 'search',
        expectedState: 'search_results_page'
      });
    }

    return {
      id: `complex_plan_${Date.now()}`,
      goal,
      steps,
      context,
      subGoals: this.extractSubGoals(steps),
      createdAt: new Date()
    };
  }

  /**
   * Execute plan with state awareness and verification
   */
  async executeWithStateAwareness(plan, webContents) {
    const results = [];
    
    for (let i = 0; i < plan.steps.length; i++) {
      const step = plan.steps[i];
      console.log(`🎯 Executing step ${i + 1}/${plan.steps.length}: ${step.description}`);
      console.log(`   Sub-goal: ${step.subGoal}, Expected state: ${step.expectedState}`);
      
      try {
        let result;
        
        // Update current state
        this.updateGoalProgress(step.subGoal, step.expectedState);
        
        switch (step.action) {
          case 'navigate':
            result = await this.executeNavigation(step.args, webContents);
            break;
          case 'click':
            result = await this.executeClick(step.args, webContents);
            break;
          case 'type':
            result = await this.executeType(step.args, webContents);
            break;
          case 'observe_state':
            result = await this.executeStateObservation(step.args, webContents);
            break;
          default:
            throw new Error(`Unknown action: ${step.action}`);
        }
        
        // Verify state after action
        if (step.expectedState) {
          const stateVerified = await this.verifyExpectedState(step.expectedState, webContents);
          result.stateVerified = stateVerified;
          if (!stateVerified) {
            console.log(`⚠️ State verification failed for: ${step.expectedState}`);
            // Try to recover or continue based on context
            result.recoveryNeeded = true;
          }
        }
        
        if (result.success) {
          console.log(`   ✅ Success: ${result.description}`);
        } else {
          console.log(`   ❌ Failed: ${result.error}`);
        }
        
        results.push(result);
        this.executionHistory.push({
          step,
          result,
          timestamp: new Date(),
          state: this.currentState
        });
        
        // Wait between steps
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.error(`❌ Step ${i + 1} failed:`, error);
        const errorResult = {
          success: false,
          error: error.message,
          step: step.description,
          action: step.action,
          subGoal: step.subGoal
        };
        results.push(errorResult);
        this.executionHistory.push({
          step,
          result: errorResult,
          timestamp: new Date()
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`✅ Complex plan execution completed: ${successCount}/${results.length} steps successful`);
    
    return {
      success: successCount > 0,
      results,
      plan: plan.id,
      completedSteps: successCount,
      totalSteps: results.length,
      subGoals: this.goalProgress,
      finalState: this.currentState
    };
  }

  /**
   * Execute state observation
   */
  async executeStateObservation(args, webContents) {
    if (!webContents) {
      throw new Error('WebContents not available');
    }
    
    try {
      console.log(`👁️ Observing state: ${args.purpose}`);
      
      const result = await webContents.executeJavaScript(`
        (() => {
          try {
            const expectedElements = ${JSON.stringify(args.expectedElements)};
            const foundElements = [];
            
            for (const selector of expectedElements) {
              const elements = document.querySelectorAll(selector);
              if (elements.length > 0) {
                foundElements.push({
                  selector: selector,
                  count: elements.length,
                  visible: Array.from(elements).filter(el => el.offsetParent !== null).length
                });
              }
            }
            
            const pageInfo = {
              url: window.location.href,
              title: document.title,
              readyState: document.readyState,
              hasExpectedElements: foundElements.length > 0,
              foundElements: foundElements,
              timestamp: Date.now()
            };
            
            return { success: true, data: pageInfo };
          } catch (error) {
            return { success: false, error: error.message };
          }
        })()
      `);
      
      if (result.success && result.data.hasExpectedElements) {
        console.log(`✅ State observation successful: Found ${result.data.foundElements.length} expected elements`);
        return {
          success: true,
          action: 'observe_state',
          result: result.data,
          description: `State verified: ${args.purpose}`
        };
      } else {
        console.log(`❌ State observation failed: Expected elements not found`);
        return {
          success: false,
          action: 'observe_state',
          error: 'Expected elements not found',
          description: `State verification failed: ${args.purpose}`
        };
      }
    } catch (error) {
      return {
        success: false,
        action: 'observe_state',
        error: error.message,
        description: `State observation error: ${args.purpose}`
      };
    }
  }

  /**
   * Verify expected state after action
   */
  async verifyExpectedState(expectedState, webContents) {
    if (!webContents) {
      return false;
    }
    
    try {
      // Define state verification rules
      const stateRules = {
        'amazon_homepage': ['#nav-logo-sprites', '#twotabsearchtextbox'],
        'search_results_page': ['[data-component-type="s-search-result"]', '.s-result-item'],
        'product_page': ['#add-to-cart-button', '#addToCart', '[name="submit.add-to-cart"]'],
        'cart_updated': ['.sw-atc-text', '#sw-atc-details-single-container', '.a-alert-success']
      };
      
      const expectedElements = stateRules[expectedState] || [];
      if (expectedElements.length === 0) {
        return true; // No specific verification needed
      }
      
      const result = await webContents.executeJavaScript(`
        (() => {
          const expectedElements = ${JSON.stringify(expectedElements)};
          let foundCount = 0;
          
          for (const selector of expectedElements) {
            const elements = document.querySelectorAll(selector);
            if (elements.length > 0) {
              foundCount++;
            }
          }
          
          return foundCount > 0;
        })()
      `);
      
      return result;
    } catch (error) {
      console.error('State verification error:', error);
      return false;
    }
  }

  /**
   * Extract product name from goal
   */
  extractProductName(goal) {
    // Try to extract product name from various patterns
    const patterns = [
      /find.*?me.*?['"](.*?)['"]/i,
      /search.*?for.*?['"](.*?)['"]/i,
      /['"](.*?)['"]/i,
      /find.*?me.*?(\w+\s+\w+)/i,
      /search.*?for.*?(\w+\s+\w+)/i
    ];
    
    for (const pattern of patterns) {
      const match = goal.match(pattern);
      if (match && match[1] && match[1].trim()) {
        return match[1].trim();
      }
    }
    
    return 'product'; // Default fallback
  }

  /**
   * Extract sub-goals from steps
   */
  extractSubGoals(steps) {
    const subGoals = [...new Set(steps.map(step => step.subGoal).filter(Boolean))];
    return subGoals;
  }

  /**
   * Update goal progress
   */
  updateGoalProgress(subGoal, expectedState) {
    if (subGoal && !this.goalProgress.completedSubGoals.includes(subGoal)) {
      this.goalProgress.completedSubGoals.push(subGoal);
    }
    
    this.goalProgress.currentPhase = subGoal || 'execution';
    this.currentState = expectedState;
  }

  /**
   * Execute navigation (same as before but enhanced)
   */
  async executeNavigation(args, webContents) {
    if (!webContents) {
      throw new Error('WebContents not available');
    }
    
    try {
      console.log(`🌐 Navigating to: ${args.url}`);
      await webContents.loadURL(args.url);
      
      // Wait for page to load completely
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Wait for DOM to be ready
      await webContents.executeJavaScript(`
        new Promise((resolve) => {
          if (document.readyState === 'complete') {
            resolve();
          } else {
            window.addEventListener('load', resolve);
            setTimeout(resolve, 5000);
          }
        })
      `);
      
      console.log(`✅ Navigation completed: ${args.url}`);
      
      return {
        success: true,
        action: 'navigate',
        result: { url: args.url },
        description: `Navigated to ${args.url}`
      };
    } catch (error) {
      console.error(`❌ Navigation failed: ${args.url}`, error);
      return {
        success: false,
        action: 'navigate',
        error: error.message,
        description: `Failed to navigate to ${args.url}`
      };
    }
  }

  /**
   * Execute click (enhanced with better element finding)
   */
  async executeClick(args, webContents) {
    if (!webContents) {
      throw new Error('WebContents not available');
    }
    
    try {
      const result = await webContents.executeJavaScript(`
        (() => {
          try {
            function findElement(selector, target, text) {
              // Try direct selector first
              let element = document.querySelector(selector);
              if (element) return element;
              
              // Try fallback selectors
              ${args.fallbackSelectors ? `
              const fallbackSelectors = ${JSON.stringify(args.fallbackSelectors)};
              for (const fallbackSelector of fallbackSelectors) {
                element = document.querySelector(fallbackSelector);
                if (element) return element;
              }
              ` : ''}
              
              // Try finding by text content
              if (target || text) {
                const elements = Array.from(document.querySelectorAll('*'));
                element = elements.find(el => {
                  const text = el.textContent?.trim().toLowerCase() || '';
                  const searchText = (target || text || '').toLowerCase();
                  return text.includes(searchText) && 
                         el.offsetParent !== null &&
                         (el.tagName === 'BUTTON' || el.tagName === 'A' || el.onclick);
                });
              }
              
              return element;
            }
            
            function interactWithElement(element, action) {
              if (!element) return { success: false, error: 'Element not found' };
              
              try {
                if (element.offsetParent === null) {
                  return { success: false, error: 'Element not visible' };
                }
                
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                element.click();
                
                return { success: true, message: 'Element clicked successfully' };
              } catch (error) {
                return { success: false, error: error.message };
              }
            }
            
            const clickElement = findElement('${args.selector || ''}', '${args.target || ''}', '${args.text || ''}');
            return interactWithElement(clickElement, 'click');
          } catch (error) {
            return { success: false, error: error.message };
          }
        })()
      `);
      
      return {
        success: result.success,
        action: 'click',
        result: result,
        description: `Clicked element: ${args.text || args.selector || args.target}`
      };
    } catch (error) {
      return {
        success: false,
        action: 'click',
        error: error.message,
        description: `Failed to click: ${args.text || args.selector || args.target}`
      };
    }
  }

  /**
   * Execute type (enhanced)
   */
  async executeType(args, webContents) {
    if (!webContents) {
      throw new Error('WebContents not available');
    }
    
    try {
      const result = await webContents.executeJavaScript(`
        (() => {
          try {
            function findElement(selector, target) {
              let element = document.querySelector(selector);
              if (element) return element;
              
              ${args.fallbackSelectors ? `
              const fallbackSelectors = ${JSON.stringify(args.fallbackSelectors)};
              for (const fallbackSelector of fallbackSelectors) {
                element = document.querySelector(fallbackSelector);
                if (element) return element;
              }
              ` : ''}
              
              if (target) {
                const elements = Array.from(document.querySelectorAll('input, textarea'));
                element = elements.find(el => {
                  const placeholder = el.placeholder?.toLowerCase() || '';
                  const name = el.name?.toLowerCase() || '';
                  const id = el.id?.toLowerCase() || '';
                  const searchTerm = target.toLowerCase();
                  return placeholder.includes(searchTerm) || 
                         name.includes(searchTerm) || 
                         id.includes(searchTerm);
                });
              }
              
              return element;
            }
            
            function interactWithElement(element, text) {
              if (!element) return { success: false, error: 'Element not found' };
              
              try {
                if (element.offsetParent === null) {
                  return { success: false, error: 'Element not visible' };
                }
                
                element.focus();
                element.value = text;
                element.dispatchEvent(new Event('input', { bubbles: true }));
                element.dispatchEvent(new Event('change', { bubbles: true }));
                
                return { success: true, message: 'Text typed successfully' };
              } catch (error) {
                return { success: false, error: error.message };
              }
            }
            
            const typeElement = findElement('${args.selector || ''}', '${args.target || ''}');
            return interactWithElement(typeElement, '${args.text || ''}');
          } catch (error) {
            return { success: false, error: error.message };
          }
        })()
      `);
      
      return {
        success: result.success,
        action: 'type',
        result: result,
        description: `Typed "${args.text}" into ${args.target || args.selector}`
      };
    } catch (error) {
      return {
        success: false,
        action: 'type',
        error: error.message,
        description: `Failed to type into: ${args.target || args.selector}`
      };
    }
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      isExecuting: this.isExecuting,
      currentGoal: this.currentGoal,
      currentPlan: this.currentPlan?.id,
      executionHistory: this.executionHistory,
      goalProgress: this.goalProgress,
      currentState: this.currentState,
      completedSteps: this.currentPlan ? this.executionHistory.length : 0,
      totalSteps: this.currentPlan ? this.currentPlan.steps.length : 0
    };
  }

  /**
   * Stop execution
   */
  async stop() {
    console.log('🛑 Stopping complex execution');
    this.isExecuting = false;
    this.currentPlan = null;
    this.currentGoal = null;
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    console.log('🧹 Cleaning up enhanced agentic browser');
    this.isExecuting = false;
    this.currentPlan = null;
    this.currentGoal = null;
    this.executionHistory = [];
    this.currentState = null;
    this.goalProgress = {
      currentPhase: 'initialization',
      completedSubGoals: [],
      remainingSubGoals: [],
      context: {}
    };
  }
}

module.exports = EnhancedAgenticBrowser;
