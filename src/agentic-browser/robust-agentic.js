/**
 * Robust Agentic Browser - Production-ready with comprehensive task handling
 * Handles simple searches, complex multi-step tasks, and everything in between
 */

class RobustAgenticBrowser {
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
    this.taskMemory = []; // Remember previous tasks for context
  }

  /**
   * Execute any goal with intelligent routing
   */
  async executeGoal(goal, context = {}, webContents = null) {
    try {
      console.log(`🤖 Executing robust agentic goal: ${goal}`);
      
      if (this.isExecuting) {
        throw new Error('Another goal is currently being executed');
      }

      this.isExecuting = true;
      this.currentGoal = goal;
      
      // Add to task memory for context
      this.taskMemory.push({
        goal,
        timestamp: new Date(),
        context
      });
      
      // Analyze goal complexity and create appropriate plan
      const plan = this.createRobustPlan(goal, context);
      this.currentPlan = plan;
      
      console.log(`📋 Generated robust plan with ${plan.steps.length} steps`);
      console.log(`🎯 Plan type: ${plan.type}`);
      
      // Execute with appropriate strategy
      const result = await this.executeWithStrategy(plan, webContents);
      
      this.isExecuting = false;
      return result;
    } catch (error) {
      this.isExecuting = false;
      console.error('❌ Robust goal execution failed:', error);
      throw error;
    }
  }

  /**
   * Create robust plan based on goal analysis
   */
  createRobustPlan(goal, context) {
    const steps = [];
    const goalLower = goal.toLowerCase();
    
    // Enhanced goal analysis with better pattern matching
    const goalAnalysis = this.analyzeGoal(goal);
    
    console.log(`🔍 Goal analysis:`, goalAnalysis);
    
    // Route to appropriate workflow
    if (goalAnalysis.isComplexTask) {
      return this.createComplexPlan(goal, context, goalAnalysis);
    } else if (goalAnalysis.isAmazonSearch) {
      return this.createAmazonSearchPlan(goal, context, goalAnalysis);
    } else if (goalAnalysis.isGoogleForms) {
      return this.createGoogleFormsPlan(goal, context, goalAnalysis);
    } else if (goalAnalysis.isNavigation) {
      return this.createNavigationPlan(goal, context, goalAnalysis);
    } else {
      return this.createGenericPlan(goal, context, goalAnalysis);
    }
  }

  /**
   * Analyze goal to determine complexity and type
   */
  analyzeGoal(goal) {
    const goalLower = goal.toLowerCase();
    
    const analysis = {
      originalGoal: goal,
      isComplexTask: false,
      isAmazonSearch: false,
      isGoogleForms: false,
      isNavigation: false,
      complexity: 'simple',
      subGoals: [],
      extractedInfo: {},
      patterns: []
    };
    
    // Complex task patterns
    const complexPatterns = [
      { pattern: /find.*?and.*?add.*?cart/i, type: 'amazon_cart', complexity: 'complex' },
      { pattern: /search.*?and.*?buy/i, type: 'amazon_purchase', complexity: 'complex' },
      { pattern: /create.*?form.*?with.*?questions/i, type: 'google_forms_creation', complexity: 'complex' },
      { pattern: /create.*?google.*?form/i, type: 'google_forms_creation', complexity: 'complex' },
      { pattern: /find.*?and.*?click/i, type: 'multi_step_interaction', complexity: 'complex' }
    ];
    
    for (const pattern of complexPatterns) {
      if (pattern.pattern.test(goalLower)) {
        analysis.isComplexTask = true;
        analysis.complexity = pattern.complexity;
        analysis.patterns.push(pattern.type);
        break;
      }
    }
    
    // Amazon search patterns
    if (goalLower.includes('amazon') || goalLower.includes('amzn')) {
      analysis.isAmazonSearch = true;
      analysis.patterns.push('amazon');
    }
    
    // Google Forms patterns
    if (goalLower.includes('google') && goalLower.includes('form')) {
      analysis.isGoogleForms = true;
      analysis.patterns.push('google_forms');
    }
    
    // Navigation patterns
    if (goalLower.includes('open') || goalLower.includes('navigate') || goalLower.includes('go to')) {
      analysis.isNavigation = true;
      analysis.patterns.push('navigation');
    }
    
    // Extract specific information
    analysis.extractedInfo = this.extractGoalInfo(goal);
    
    return analysis;
  }

  /**
   * Extract specific information from goal
   */
  extractGoalInfo(goal) {
    const info = {};
    
    // Extract product names with better patterns
    const productPatterns = [
      /find.*?me.*?['"](.*?)['"]/i,
      /search.*?for.*?['"](.*?)['"]/i,
      /find.*?['"](.*?)['"]/i,
      /search.*?['"](.*?)['"]/i,
      /['"](.*?)['"]/i,
      // Better patterns for common product names
      /find.*?(iphone\s+\d+)/i,
      /search.*?for.*?(iphone\s+\d+)/i,
      /find.*?(samsung\s+\w+)/i,
      /search.*?for.*?(samsung\s+\w+)/i,
      /find.*?(laptop\s+\w+)/i,
      /search.*?for.*?(laptop\s+\w+)/i,
      // Generic patterns
      /find.*?(\w+\s+\w+)/i,
      /search.*?for.*?(\w+\s+\w+)/i
    ];
    
    for (const pattern of productPatterns) {
      const match = goal.match(pattern);
      if (match && match[1] && match[1].trim()) {
        const extracted = match[1].trim();
        // Skip generic words like "me", "a", "the"
        if (!['me', 'a', 'the', 'an'].includes(extracted.toLowerCase())) {
          info.productName = extracted;
          break;
        }
      }
    }
    
    // If no product name found, try to extract from the goal more intelligently
    if (!info.productName) {
      const goalLower = goal.toLowerCase();
      
      // Look for iPhone patterns
      if (goalLower.includes('iphone')) {
        const iphoneMatch = goal.match(/iphone\s*(\d+)/i);
        if (iphoneMatch) {
          info.productName = `iphone ${iphoneMatch[1]}`;
        } else {
          info.productName = 'iphone';
        }
      }
      // Look for Samsung patterns
      else if (goalLower.includes('samsung')) {
        const samsungMatch = goal.match(/samsung\s+(\w+)/i);
        if (samsungMatch) {
          info.productName = `samsung ${samsungMatch[1]}`;
        } else {
          info.productName = 'samsung';
        }
      }
      // Look for laptop patterns
      else if (goalLower.includes('laptop')) {
        info.productName = 'laptop';
      }
      // Look for any word after "find" or "search for"
      else {
        const findMatch = goal.match(/(?:find|search.*?for)\s+(\w+)/i);
        if (findMatch && !['me', 'a', 'the', 'an'].includes(findMatch[1].toLowerCase())) {
          info.productName = findMatch[1];
        }
      }
    }
    
    // Extract question types for forms
    if (goal.toLowerCase().includes('mcq') || goal.toLowerCase().includes('multiple choice')) {
      info.questionType = 'multiple_choice';
    }
    
    // Extract numbers
    const numberMatch = goal.match(/(\d+)/);
    if (numberMatch) {
      info.count = parseInt(numberMatch[1]);
    }
    
    return info;
  }

  /**
   * Create complex multi-step plan
   */
  createComplexPlan(goal, context, analysis) {
    const steps = [];
    
    if (analysis.patterns.includes('amazon_cart')) {
      // Amazon find and add to cart workflow
      const productName = analysis.extractedInfo.productName || 'product';
      
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
      
    } else if (analysis.patterns.includes('google_forms_creation')) {
      // Google Forms creation workflow
      steps.push({
        action: 'navigate',
        args: { url: 'https://forms.google.com' },
        description: 'Navigate to Google Forms',
        subGoal: 'navigation',
        expectedState: 'google_forms_homepage'
      });
      
      steps.push({
        action: 'observe_state',
        args: { 
          purpose: 'verify_forms_page',
          expectedElements: ['[data-testid="create-form-button"]', '.freebirdFormviewerViewCenteredContent', '[role="button"]'],
          timeout: 5000
        },
        description: 'Verify Google Forms page loaded',
        subGoal: 'form_setup',
        expectedState: 'forms_page_loaded'
      });
      
      steps.push({
        action: 'click',
        args: { 
          selector: '[data-testid="create-form-button"]',
          fallbackSelectors: ['[role="button"]', '.freebirdFormviewerViewCenteredContent [role="button"]'],
          text: 'Blank'
        },
        description: 'Click on Blank form template',
        subGoal: 'form_setup',
        expectedState: 'form_editor_loaded'
      });
      
      steps.push({
        action: 'observe_state',
        args: { 
          purpose: 'verify_form_editor',
          expectedElements: ['[data-testid="form-title"]', '.freebirdFormviewerViewItemsItemItemTitle', 'input[aria-label*="title"]'],
          timeout: 5000
        },
        description: 'Verify form editor loaded',
        subGoal: 'form_creation',
        expectedState: 'form_editor_ready'
      });
      
      // Add form title
      steps.push({
        action: 'type',
        args: { 
          selector: '[data-testid="form-title"]',
          text: 'Random MCQ Questions',
          fallbackSelectors: ['input[aria-label*="title"]', '.freebirdFormviewerViewItemsItemItemTitle input']
        },
        description: 'Add form title',
        subGoal: 'form_creation',
        expectedState: 'form_titled'
      });
      
      // Add first question
      steps.push({
        action: 'type',
        args: { 
          selector: '[data-testid="question-title-input"]',
          text: 'What is the capital of France?',
          fallbackSelectors: ['input[aria-label*="question"]', '.freebirdFormviewerViewItemsItemItemTitle input']
        },
        description: 'Add first question',
        subGoal: 'form_creation',
        expectedState: 'question_added'
      });
      
      // Set question type to multiple choice
      steps.push({
        action: 'click',
        args: { 
          selector: '[data-testid="question-type-selector"]',
          fallbackSelectors: ['[role="button"][aria-label*="type"]', '.freebirdFormviewerViewItemsItemItemQuestionTypeSelector'],
          text: 'Multiple choice'
        },
        description: 'Set question type to multiple choice',
        subGoal: 'form_creation',
        expectedState: 'question_type_set'
      });
      
      // Add answer options
      const options = ['Paris', 'London', 'Berlin', 'Madrid'];
      options.forEach((option, index) => {
        steps.push({
          action: 'type',
          args: { 
            selector: `[data-testid="option-input-${index}"]`,
            text: option,
            fallbackSelectors: [`input[aria-label*="option ${index + 1}"]`, `input[placeholder*="option"]`]
          },
          description: `Add option ${index + 1}: ${option}`,
          subGoal: 'form_creation',
          expectedState: 'option_added'
        });
      });
    }
    
    return {
      id: `complex_plan_${Date.now()}`,
      goal,
      steps,
      context,
      type: 'complex',
      subGoals: this.extractSubGoals(steps),
      analysis,
      createdAt: new Date()
    };
  }

  /**
   * Create Amazon search plan
   */
  createAmazonSearchPlan(goal, context, analysis) {
    const steps = [];
    const productName = analysis.extractedInfo.productName || 'product';
    
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
    
    return {
      id: `amazon_search_plan_${Date.now()}`,
      goal,
      steps,
      context,
      type: 'amazon_search',
      subGoals: this.extractSubGoals(steps),
      analysis,
      createdAt: new Date()
    };
  }

  /**
   * Create Google Forms plan
   */
  createGoogleFormsPlan(goal, context, analysis) {
    const steps = [];
    
    steps.push({
      action: 'navigate',
      args: { url: 'https://forms.google.com' },
      description: 'Navigate to Google Forms',
      subGoal: 'navigation',
      expectedState: 'google_forms_homepage'
    });
    
    return {
      id: `google_forms_plan_${Date.now()}`,
      goal,
      steps,
      context,
      type: 'google_forms',
      subGoals: this.extractSubGoals(steps),
      analysis,
      createdAt: new Date()
    };
  }

  /**
   * Create navigation plan
   */
  createNavigationPlan(goal, context, analysis) {
    const steps = [];
    
    // Extract URL from goal
    const urlMatch = goal.match(/(https?:\/\/[^\s]+)/i);
    if (urlMatch) {
      steps.push({
        action: 'navigate',
        args: { url: urlMatch[1] },
        description: `Navigate to ${urlMatch[1]}`,
        subGoal: 'navigation',
        expectedState: 'page_loaded'
      });
    } else {
      // Try to determine URL from context
      let url = 'https://google.com'; // Default fallback
      
      if (goal.toLowerCase().includes('amazon')) {
        url = 'https://amazon.com';
      } else if (goal.toLowerCase().includes('google') && goal.toLowerCase().includes('form')) {
        url = 'https://forms.google.com';
      }
      
      steps.push({
        action: 'navigate',
        args: { url },
        description: `Navigate to ${url}`,
        subGoal: 'navigation',
        expectedState: 'page_loaded'
      });
    }
    
    return {
      id: `navigation_plan_${Date.now()}`,
      goal,
      steps,
      context,
      type: 'navigation',
      subGoals: this.extractSubGoals(steps),
      analysis,
      createdAt: new Date()
    };
  }

  /**
   * Create generic plan
   */
  createGenericPlan(goal, context, analysis) {
    const steps = [];
    
    // Generic fallback - try to navigate somewhere useful
    steps.push({
      action: 'navigate',
      args: { url: 'https://google.com' },
      description: 'Navigate to Google (fallback)',
      subGoal: 'navigation',
      expectedState: 'page_loaded'
    });
    
    return {
      id: `generic_plan_${Date.now()}`,
      goal,
      steps,
      context,
      type: 'generic',
      subGoals: this.extractSubGoals(steps),
      analysis,
      createdAt: new Date()
    };
  }

  /**
   * Execute plan with appropriate strategy
   */
  async executeWithStrategy(plan, webContents) {
    if (plan.type === 'complex') {
      return await this.executeComplexPlan(plan, webContents);
    } else {
      return await this.executeSimplePlan(plan, webContents);
    }
  }

  /**
   * Execute complex plan with state awareness
   */
  async executeComplexPlan(plan, webContents) {
    const results = [];
    
    for (let i = 0; i < plan.steps.length; i++) {
      const step = plan.steps[i];
      console.log(`🎯 Executing step ${i + 1}/${plan.steps.length}: ${step.description}`);
      console.log(`   Sub-goal: ${step.subGoal}, Expected state: ${step.expectedState}`);
      
      try {
        let result;
        
        // Update goal progress
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
      finalState: this.currentState,
      planType: plan.type
    };
  }

  /**
   * Execute simple plan
   */
  async executeSimplePlan(plan, webContents) {
    const results = [];
    
    for (let i = 0; i < plan.steps.length; i++) {
      const step = plan.steps[i];
      console.log(`🎯 Executing step ${i + 1}/${plan.steps.length}: ${step.description}`);
      
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
        
        // Wait between steps
        await new Promise(resolve => setTimeout(resolve, 1500));
        
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
    console.log(`✅ Simple plan execution completed: ${successCount}/${results.length} steps successful`);
    
    return {
      success: successCount > 0,
      results,
      plan: plan.id,
      completedSteps: successCount,
      totalSteps: results.length,
      planType: plan.type
    };
  }

  /**
   * Execute navigation
   */
  async executeNavigation(args, webContents) {
    if (!webContents) {
      throw new Error('WebContents not available');
    }
    
    try {
      console.log(`🌐 Navigating to: ${args.url}`);
      await webContents.loadURL(args.url);
      
      // Wait for page to load
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
   * Execute click with robust element finding
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
   * Execute type with robust element finding
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
   * Verify expected state
   */
  async verifyExpectedState(expectedState, webContents) {
    if (!webContents) {
      return false;
    }
    
    try {
      const stateRules = {
        'amazon_homepage': ['#nav-logo-sprites', '#twotabsearchtextbox'],
        'search_results_page': ['[data-component-type="s-search-result"]', '.s-result-item'],
        'product_page': ['#add-to-cart-button', '#addToCart', '[name="submit.add-to-cart"]'],
        'cart_updated': ['.sw-atc-text', '#sw-atc-details-single-container', '.a-alert-success'],
        'google_forms_homepage': ['[data-testid="create-form-button"]', '.freebirdFormviewerViewCenteredContent'],
        'form_editor_loaded': ['[data-testid="form-title"]', '.freebirdFormviewerViewItemsItemItemTitle'],
        'page_loaded': ['body', 'html']
      };
      
      const expectedElements = stateRules[expectedState] || [];
      if (expectedElements.length === 0) {
        return true;
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
      totalSteps: this.currentPlan ? this.currentPlan.steps.length : 0,
      taskMemory: this.taskMemory
    };
  }

  /**
   * Stop execution
   */
  async stop() {
    console.log('🛑 Stopping robust execution');
    this.isExecuting = false;
    this.currentPlan = null;
    this.currentGoal = null;
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    console.log('🧹 Cleaning up robust agentic browser');
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
    this.taskMemory = [];
  }
}

module.exports = RobustAgenticBrowser;
