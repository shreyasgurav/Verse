/**
 * Simplified Agentic Browser for Electron
 * A working implementation that integrates with the existing Verse Browser
 */

const { ipcMain } = require('electron');

class SimpleAgenticBrowser {
  constructor() {
    this.isExecuting = false;
    this.currentPlan = null;
    this.executionHistory = [];
  }

  /**
   * Execute a user goal using the existing browser automation
   */
  async executeGoal(goal, context = {}, webContents = null) {
    try {
      console.log(`🤖 Executing agentic goal: ${goal}`);
      
      if (this.isExecuting) {
        throw new Error('Another goal is currently being executed');
      }

      this.isExecuting = true;
      
      // Create a simple plan based on the goal
      const plan = this.createSimplePlan(goal, context);
      this.currentPlan = plan;
      
      console.log(`📋 Generated plan with ${plan.steps.length} steps`);
      
      // Execute the plan
      const result = await this.executeSimplePlan(plan, webContents);
      
      this.isExecuting = false;
      return result;
    } catch (error) {
      this.isExecuting = false;
      console.error('❌ Goal execution failed:', error);
      throw error;
    }
  }

  /**
   * Create a simple plan based on goal analysis
   */
  createSimplePlan(goal, context) {
    const steps = [];
    const goalLower = goal.toLowerCase();
    
    // Enhanced goal analysis with better pattern matching
    if (goalLower.includes('search') && goalLower.includes('amazon')) {
      // Amazon search workflow
      steps.push({
        action: 'navigate',
        args: { url: 'https://amazon.com' },
        description: 'Navigate to Amazon'
      });
      
      // Extract search query - multiple patterns
      let query = null;
      const patterns = [
        /search.*?for.*?['"](.*?)['"]/i,
        /search.*?['"](.*?)['"]/i,
        /['"](.*?)['"]/i,
        /search\s+([^'"]+)/i
      ];
      
      for (const pattern of patterns) {
        const match = goal.match(pattern);
        if (match && match[1] && match[1].trim()) {
          query = match[1].trim();
          break;
        }
      }
      
      if (query) {
        // Amazon-specific selectors
        steps.push({
          action: 'type',
          args: { 
            selector: '#twotabsearchtextbox',
            text: query,
            fallbackSelectors: ['input[name="field-keywords"]', 'input[type="text"]']
          },
          description: `Type search query: ${query}`
        });
        steps.push({
          action: 'click',
          args: { 
            selector: '#nav-search-submit-button',
            fallbackSelectors: ['input[type="submit"]', 'button[type="submit"]']
          },
          description: 'Click Amazon search button'
        });
      }
    } else if (goalLower.includes('search') && goalLower.includes('google')) {
      // Google search workflow
      steps.push({
        action: 'navigate',
        args: { url: 'https://google.com' },
        description: 'Navigate to Google'
      });
      
      // Extract search query
      let query = null;
      const patterns = [
        /search.*?for.*?['"](.*?)['"]/i,
        /search.*?['"](.*?)['"]/i,
        /['"](.*?)['"]/i
      ];
      
      for (const pattern of patterns) {
        const match = goal.match(pattern);
        if (match && match[1] && match[1].trim()) {
          query = match[1].trim();
          break;
        }
      }
      
      if (query) {
        steps.push({
          action: 'type',
          args: { selector: 'input[name="q"]', text: query },
          description: `Type search query: ${query}`
        });
        steps.push({
          action: 'click',
          args: { selector: 'input[value="Google Search"]' },
          description: 'Click Google search button'
        });
      }
    } else if (goalLower.includes('amazon')) {
      // Just navigate to Amazon
      steps.push({
        action: 'navigate',
        args: { url: 'https://amazon.com' },
        description: 'Navigate to Amazon'
      });
    } else if (goalLower.includes('navigate') || goalLower.includes('go to') || goalLower.includes('open')) {
      // Extract URL from goal
      const urlMatch = goal.match(/(https?:\/\/[^\s]+)/i);
      if (urlMatch) {
        steps.push({
          action: 'navigate',
          args: { url: urlMatch[1] },
          description: `Navigate to ${urlMatch[1]}`
        });
      }
    } else if (goalLower.includes('click') && goalLower.includes('button')) {
      // Extract button text
      const buttonMatch = goal.match(/click.*?['"](.*?)['"]/i);
      if (buttonMatch) {
        steps.push({
          action: 'click',
          args: { text: buttonMatch[1] },
          description: `Click button: ${buttonMatch[1]}`
        });
      }
    } else if (goalLower.includes('fill') || goalLower.includes('type')) {
      // Extract form field and text
      const typeMatch = goal.match(/type.*?['"](.*?)['"].*?into.*?['"](.*?)['"]/i);
      if (typeMatch) {
        steps.push({
          action: 'type',
          args: { text: typeMatch[1], element: typeMatch[2] },
          description: `Type "${typeMatch[1]}" into "${typeMatch[2]}"`
        });
      }
    } else if (goalLower.includes('search') && !goalLower.includes('amazon') && !goalLower.includes('google')) {
      // Generic search - try to extract query and search on current site
      let query = null;
      const patterns = [
        /search.*?for.*?['"](.*?)['"]/i,
        /search.*?['"](.*?)['"]/i,
        /['"](.*?)['"]/i
      ];
      
      for (const pattern of patterns) {
        const match = goal.match(pattern);
        if (match && match[1] && match[1].trim()) {
          query = match[1].trim();
          break;
        }
      }
      
      if (query) {
        steps.push({
          action: 'type',
          args: { 
            element: 'search',
            text: query,
            fallbackSelectors: ['input[type="search"]', 'input[name*="search"]', 'input[placeholder*="search"]']
          },
          description: `Type search query: ${query}`
        });
        steps.push({
          action: 'click',
          args: { 
            text: 'search',
            fallbackSelectors: ['button[type="submit"]', 'input[type="submit"]']
          },
          description: 'Click search button'
        });
      }
    } else {
      // Generic fallback
      steps.push({
        action: 'navigate',
        args: { url: 'https://example.com' },
        description: 'Navigate to example.com (fallback)'
      });
    }

    return {
      id: `plan_${Date.now()}`,
      goal,
      steps,
      context,
      createdAt: new Date()
    };
  }

  /**
   * Execute the simple plan using existing browser automation
   */
  async executeSimplePlan(plan, webContents) {
    const results = [];
    
      for (let i = 0; i < plan.steps.length; i++) {
        const step = plan.steps[i];
        console.log(`🎯 Executing step ${i + 1}/${plan.steps.length}: ${step.description}`);
        console.log(`   Action: ${step.action}`, step.args);
        
        try {
          let result;
          
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
            default:
              throw new Error(`Unknown action: ${step.action}`);
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
            timestamp: new Date()
          });
          
          // Wait between steps to allow page to settle
          if (step.action === 'navigate') {
            await new Promise(resolve => setTimeout(resolve, 2000)); // Longer wait after navigation
          } else {
            await new Promise(resolve => setTimeout(resolve, 1000)); // Normal wait
          }
          
        } catch (error) {
          console.error(`❌ Step ${i + 1} failed:`, error);
          const errorResult = {
            success: false,
            error: error.message,
            step: step.description,
            action: step.action
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
    console.log(`✅ Plan execution completed: ${successCount}/${results.length} steps successful`);
    
    return {
      success: successCount > 0,
      results,
      plan: plan.id,
      completedSteps: successCount,
      totalSteps: results.length
    };
  }

  /**
   * Execute navigation action
   */
  async executeNavigation(args, webContents) {
    if (!webContents) {
      throw new Error('WebContents not available');
    }
    
    try {
      console.log(`🌐 Navigating to: ${args.url}`);
      await webContents.loadURL(args.url);
      
      // Wait for page to load completely
      await new Promise(resolve => setTimeout(resolve, 3000)); // Initial wait
      
      // Wait for DOM to be ready
      await webContents.executeJavaScript(`
        new Promise((resolve) => {
          if (document.readyState === 'complete') {
            resolve();
          } else {
            window.addEventListener('load', resolve);
            setTimeout(resolve, 5000); // Fallback timeout
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
   * Execute click action using existing automation
   */
  async executeClick(args, webContents) {
    if (!webContents) {
      throw new Error('WebContents not available');
    }
    
    try {
      // Use the existing robust execute-action functionality
      const result = await webContents.executeJavaScript(`
        (() => {
          try {
            // Simplified but robust element interaction
            function findElement(selector, target) {
              // Try direct selector first
              let element = document.querySelector(selector);
              if (element) return element;
              
              // If no target, return null
              if (!target) return null;
              
              // Try finding by text content
              const elements = Array.from(document.querySelectorAll('*'));
              element = elements.find(el => {
                const text = el.textContent?.trim().toLowerCase() || '';
                return text.includes(target.toLowerCase()) && 
                       el.offsetParent !== null &&
                       (el.tagName === 'BUTTON' || el.tagName === 'A' || el.onclick);
              });
              
              if (element) return element;
              
              // Try finding input by placeholder
              element = document.querySelector(\`input[placeholder*="\${target}"], textarea[placeholder*="\${target}"]\`);
              if (element) return element;
              
              // Try finding by aria-label
              element = document.querySelector(\`[aria-label*="\${target}"]\`);
              if (element) return element;
              
              return null;
            }
            
            function interactWithElement(element, action, text) {
              if (!element) return { success: false, error: 'Element not found' };
              
              try {
                // Make sure element is visible
                if (element.offsetParent === null) {
                  return { success: false, error: 'Element not visible' };
                }
                
                // Scroll into view
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                
                // Execute action immediately
                switch (action) {
                  case 'click':
                    element.click();
                    break;
                    
                  case 'type':
                    if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                      element.focus();
                      element.value = text;
                      element.dispatchEvent(new Event('input', { bubbles: true }));
                      element.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                    break;
                }
                
                return { success: true, message: \`Successfully \${action}ed element\` };
              } catch (error) {
                return { success: false, error: error.message };
              }
            }
            
            // Main execution with fallback selectors
            let clickElement = findElement('${args.selector || ''}', '${args.text || ''}');
            
            // Try fallback selectors if main selector fails
            ${args.fallbackSelectors ? `
            if (!clickElement && args.fallbackSelectors) {
              for (const fallbackSelector of ${JSON.stringify(args.fallbackSelectors || [])}) {
                clickElement = findElement(fallbackSelector, '');
                if (clickElement) break;
              }
            }
            ` : ''}
            
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
        description: `Clicked element: ${args.text || args.selector}`
      };
    } catch (error) {
      return {
        success: false,
        action: 'click',
        error: error.message,
        description: `Failed to click: ${args.text || args.selector}`
      };
    }
  }

  /**
   * Execute type action using existing automation
   */
  async executeType(args, webContents) {
    if (!webContents) {
      throw new Error('WebContents not available');
    }
    
    try {
      // Use the existing robust execute-action functionality
      const result = await webContents.executeJavaScript(`
        (() => {
          try {
            // Simplified but robust element interaction
            function findElement(selector, target) {
              // Try direct selector first
              let element = document.querySelector(selector);
              if (element) return element;
              
              // If no target, return null
              if (!target) return null;
              
              // Try finding by text content
              const elements = Array.from(document.querySelectorAll('*'));
              element = elements.find(el => {
                const text = el.textContent?.trim().toLowerCase() || '';
                return text.includes(target.toLowerCase()) && 
                       el.offsetParent !== null &&
                       (el.tagName === 'BUTTON' || el.tagName === 'A' || el.onclick);
              });
              
              if (element) return element;
              
              // Try finding input by placeholder
              element = document.querySelector(\`input[placeholder*="\${target}"], textarea[placeholder*="\${target}"]\`);
              if (element) return element;
              
              // Try finding by aria-label
              element = document.querySelector(\`[aria-label*="\${target}"]\`);
              if (element) return element;
              
              return null;
            }
            
            function interactWithElement(element, action, text) {
              if (!element) return { success: false, error: 'Element not found' };
              
              try {
                // Make sure element is visible
                if (element.offsetParent === null) {
                  return { success: false, error: 'Element not visible' };
                }
                
                // Scroll into view
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                
                // Execute action immediately
                switch (action) {
                  case 'click':
                    element.click();
                    break;
                    
                  case 'type':
                    if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                      element.focus();
                      element.value = text;
                      element.dispatchEvent(new Event('input', { bubbles: true }));
                      element.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                    break;
                }
                
                return { success: true, message: \`Successfully \${action}ed element\` };
              } catch (error) {
                return { success: false, error: error.message };
              }
            }
            
            // Main execution with fallback selectors
            let typeElement = findElement('${args.selector || ''}', '${args.element || ''}');
            
            // Try fallback selectors if main selector fails
            ${args.fallbackSelectors ? `
            if (!typeElement && args.fallbackSelectors) {
              for (const fallbackSelector of ${JSON.stringify(args.fallbackSelectors || [])}) {
                typeElement = findElement(fallbackSelector, '');
                if (typeElement) break;
              }
            }
            ` : ''}
            
            return interactWithElement(typeElement, 'type', '${args.text || ''}');
          } catch (error) {
            return { success: false, error: error.message };
          }
        })()
      `);
      
      return {
        success: result.success,
        action: 'type',
        result: result,
        description: `Typed "${args.text}" into ${args.element || args.selector}`
      };
    } catch (error) {
      return {
        success: false,
        action: 'type',
        error: error.message,
        description: `Failed to type into: ${args.element || args.selector}`
      };
    }
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      isExecuting: this.isExecuting,
      currentPlan: this.currentPlan?.id,
      executionHistory: this.executionHistory,
      completedSteps: this.currentPlan ? this.executionHistory.length : 0,
      totalSteps: this.currentPlan ? this.currentPlan.steps.length : 0
    };
  }

  /**
   * Stop execution
   */
  async stop() {
    console.log('🛑 Stopping execution');
    this.isExecuting = false;
    this.currentPlan = null;
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    console.log('🧹 Cleaning up agentic browser');
    this.isExecuting = false;
    this.currentPlan = null;
    this.executionHistory = [];
  }
}

module.exports = SimpleAgenticBrowser;
