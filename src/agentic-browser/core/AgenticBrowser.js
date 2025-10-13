/**
 * Main Agentic Browser orchestrator
 * Coordinates planning, observation, execution, and verification
 */

const CONFIG = require('../config/index.js');
const { Task, ActionPlan, TASK_STATUS, VERIFICATION_METHODS } = require('../types/index.js');
const Logger = require('../utils/logging/Logger.js').Logger;
const CDPService = require('../services/cdp/CDPService.js');
const LLMService = require('../services/llm/LLMService.js');
const SelectorGenerator = require('../utils/selectors/SelectorGenerator.js');
const Verifier = require('./verifier/Verifier.js');
const SafetyManager = require('../utils/safety/SafetyManager.js');

class AgenticBrowser {
  constructor(webContents) {
    this.webContents = webContents;
    this.logger = new Logger('AgenticBrowser');
    
    // Core services
    this.cdpService = new CDPService(webContents);
    this.llmService = new LLMService();
    this.selectorGenerator = new SelectorGenerator();
    this.verifier = new Verifier(this.cdpService);
    this.safetyManager = new SafetyManager();
    
    // State management
    this.currentPlan = null;
    this.currentState = null;
    this.executionHistory = [];
    this.isExecuting = false;
    
    // Initialize
    this.initialize();
  }

  /**
   * Initialize the agentic browser
   */
  async initialize() {
    try {
      this.logger.info('Initializing Agentic Browser');
      
      await this.cdpService.initialize();
      await this.safetyManager.initialize();
      
      // Get initial state
      this.currentState = await this.cdpService.getPageState();
      
      this.logger.info('Agentic Browser initialized successfully');
      return true;
    } catch (error) {
      this.logger.error('Failed to initialize Agentic Browser:', error);
      throw error;
    }
  }

  /**
   * Execute user goal
   */
  async executeGoal(goal, context = {}) {
    try {
      this.logger.info(`Executing goal: ${goal}`);
      
      if (this.isExecuting) {
        throw new Error('Another goal is currently being executed');
      }

      this.isExecuting = true;
      
      // Safety check
      const safetyCheck = await this.safetyManager.validateGoal(goal, context);
      if (!safetyCheck.isValid) {
        throw new Error(`Safety check failed: ${safetyCheck.errors.join(', ')}`);
      }

      // Generate action plan
      this.currentPlan = await this.llmService.generateActionPlan(goal, this.currentState, context);
      
      // Validate plan
      const planValidation = this.llmService.validateActionPlan(this.currentPlan);
      if (!planValidation.isValid) {
        throw new Error(`Invalid action plan: ${planValidation.errors.join(', ')}`);
      }

      this.logger.info(`Generated plan with ${this.currentPlan.steps.length} steps`);

      // Execute plan
      const result = await this.executePlan(this.currentPlan);
      
      this.isExecuting = false;
      return result;
    } catch (error) {
      this.isExecuting = false;
      this.logger.error('Failed to execute goal:', error);
      throw error;
    }
  }

  /**
   * Execute action plan
   */
  async executePlan(plan) {
    try {
      this.logger.info(`Executing plan: ${plan.id}`);
      
      const results = [];
      let currentStepIndex = 0;

      for (let i = 0; i < plan.steps.length; i++) {
        const step = plan.steps[i];
        currentStepIndex = i;
        
        this.logger.info(`Executing step ${i + 1}/${plan.steps.length}: ${step.action}`);
        
        try {
          // Update current state
          this.currentState = await this.cdpService.getPageState();
          
          // Execute step
          const result = await this.executeStep(step);
          results.push(result);
          
          // Log execution
          this.executionHistory.push({
            step,
            result,
            timestamp: new Date(),
            state: this.currentState
          });
          
          // Check if we need to refine the plan
          if (!result.success && step.retryCount < step.maxRetries) {
            this.logger.warn(`Step failed, retrying (${step.retryCount + 1}/${step.maxRetries})`);
            step.retryCount++;
            i--; // Retry this step
            continue;
          } else if (!result.success) {
            this.logger.error(`Step failed after ${step.maxRetries} retries`);
            
            // Try to recover or refine plan
            const refinedPlan = await this.llmService.refineActionPlan(
              plan,
              this.currentState,
              result
            );
            
            if (refinedPlan.steps.length > 0) {
              this.logger.info('Refined plan generated, continuing execution');
              plan.steps = refinedPlan.steps;
              i = currentStepIndex; // Continue from current position
              continue;
            } else {
              throw new Error(`Step failed: ${result.error}`);
            }
          }
          
          // Small delay between steps
          await new Promise(resolve => setTimeout(resolve, 500));
          
        } catch (error) {
          this.logger.error(`Step execution failed:`, error);
          
          // Try to recover
          const recoveryResult = await this.attemptRecovery(step, error);
          if (recoveryResult) {
            results.push(recoveryResult);
            continue;
          }
          
          throw error;
        }
      }

      this.logger.info(`Plan execution completed successfully`);
      return {
        success: true,
        results,
        plan: plan.id,
        completedSteps: results.length,
        totalSteps: plan.steps.length
      };
    } catch (error) {
      this.logger.error('Plan execution failed:', error);
      return {
        success: false,
        error: error.message,
        completedSteps: currentStepIndex,
        totalSteps: plan.steps.length
      };
    }
  }

  /**
   * Execute individual step
   */
  async executeStep(step) {
    try {
      this.logger.debug(`Executing step: ${step.action}`, step.args);
      
      let result;
      
      switch (step.action) {
        case 'navigate':
          result = await this.cdpService.navigate(step.args.url);
          break;
          
        case 'click':
          result = await this.executeClick(step);
          break;
          
        case 'type':
          result = await this.executeType(step);
          break;
          
        case 'scroll':
          result = await this.cdpService.scroll(step.args.direction, step.args.amount);
          break;
          
        case 'wait':
          result = await this.executeWait(step);
          break;
          
        case 'evaluate':
          result = await this.executeEvaluate(step);
          break;
          
        default:
          throw new Error(`Unknown action: ${step.action}`);
      }
      
      // Verify step if verification is specified
      if (step.verification && result.success) {
        const verification = await this.verifier.verify(
          step.verification.method,
          step.verification.expected,
          this.currentState
        );
        
        result.verification = verification;
        
        if (!verification.passed) {
          result.success = false;
          result.error = `Verification failed: ${verification.details}`;
        }
      }
      
      return result;
    } catch (error) {
      this.logger.error(`Step execution failed:`, error);
      return {
        success: false,
        action: step.action,
        error: error.message,
        duration: 0
      };
    }
  }

  /**
   * Execute click action with selector generation
   */
  async executeClick(step) {
    try {
      let selector = step.selector;
      
      // Generate selector if not provided
      if (!selector && step.args.element) {
        const candidates = await this.selectorGenerator.generateSelectors(
          step.args.element,
          this.currentState,
          this.cdpService
        );
        
        if (candidates.length === 0) {
          throw new Error(`No selector found for element: ${step.args.element}`);
        }
        
        selector = candidates[0].selector;
        this.logger.debug(`Generated selector: ${selector}`);
      }
      
      if (!selector) {
        throw new Error('No selector provided for click action');
      }
      
      return await this.cdpService.clickElement(selector, step.args.coordinates);
    } catch (error) {
      this.logger.error('Click execution failed:', error);
      throw error;
    }
  }

  /**
   * Execute type action
   */
  async executeType(step) {
    try {
      let selector = step.selector;
      
      // Generate selector if not provided
      if (!selector && step.args.element) {
        const candidates = await this.selectorGenerator.generateSelectors(
          step.args.element,
          this.currentState,
          this.cdpService
        );
        
        if (candidates.length === 0) {
          throw new Error(`No selector found for element: ${step.args.element}`);
        }
        
        selector = candidates[0].selector;
      }
      
      if (!selector) {
        throw new Error('No selector provided for type action');
      }
      
      return await this.cdpService.typeText(selector, step.args.text);
    } catch (error) {
      this.logger.error('Type execution failed:', error);
      throw error;
    }
  }

  /**
   * Execute wait action
   */
  async executeWait(step) {
    try {
      if (step.args.duration) {
        await new Promise(resolve => setTimeout(resolve, step.args.duration));
        return {
          success: true,
          action: 'wait',
          result: { duration: step.args.duration },
          duration: step.args.duration
        };
      }
      
      if (step.args.condition) {
        const startTime = Date.now();
        const timeout = step.args.timeout || 10000;
        
        while (Date.now() - startTime < timeout) {
          const conditionMet = await this.verifier.verify(
            step.args.condition.method,
            step.args.condition.expected,
            this.currentState
          );
          
          if (conditionMet.passed) {
            return {
              success: true,
              action: 'wait',
              result: { condition: step.args.condition },
              duration: Date.now() - startTime
            };
          }
          
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        throw new Error('Wait condition timeout');
      }
      
      throw new Error('Invalid wait action parameters');
    } catch (error) {
      this.logger.error('Wait execution failed:', error);
      throw error;
    }
  }

  /**
   * Execute evaluate action
   */
  async executeEvaluate(step) {
    try {
      if (!step.args.code) {
        throw new Error('No code provided for evaluate action');
      }
      
      // Safety check
      const safetyCheck = this.safetyManager.validateCode(step.args.code);
      if (!safetyCheck.isValid) {
        throw new Error(`Code safety check failed: ${safetyCheck.errors.join(', ')}`);
      }
      
      const result = await this.cdpService.evaluate(step.args.code);
      
      return {
        success: true,
        action: 'evaluate',
        result: result.value,
        duration: 0
      };
    } catch (error) {
      this.logger.error('Evaluate execution failed:', error);
      throw error;
    }
  }

  /**
   * Attempt recovery from failed step
   */
  async attemptRecovery(step, error) {
    try {
      this.logger.info(`Attempting recovery for step: ${step.action}`);
      
      // Update current state
      this.currentState = await this.cdpService.getPageState();
      
      // Try alternative approaches
      if (step.action === 'click' && !step.selector) {
        // Try to find element by text
        const textSelector = await this.selectorGenerator.generateSelectorFromText(
          step.args.element,
          this.cdpService
        );
        
        if (textSelector) {
          return await this.cdpService.clickElement(textSelector.selector);
        }
      }
      
      // Try scrolling to make element visible
      if (step.action === 'click' || step.action === 'type') {
        await this.cdpService.scroll('down', 300);
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Retry the action
        return await this.executeStep(step);
      }
      
      return null;
    } catch (recoveryError) {
      this.logger.error('Recovery attempt failed:', recoveryError);
      return null;
    }
  }

  /**
   * Get current execution status
   */
  getStatus() {
    return {
      isExecuting: this.isExecuting,
      currentPlan: this.currentPlan?.id,
      currentState: this.currentState,
      executionHistory: this.executionHistory,
      completedSteps: this.currentPlan ? this.currentPlan.currentStepIndex : 0,
      totalSteps: this.currentPlan ? this.currentPlan.steps.length : 0
    };
  }

  /**
   * Stop current execution
   */
  async stop() {
    this.logger.info('Stopping execution');
    this.isExecuting = false;
    this.currentPlan = null;
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    try {
      this.logger.info('Cleaning up Agentic Browser');
      await this.cdpService.cleanup();
      await this.safetyManager.cleanup();
      this.logger.info('Cleanup completed');
    } catch (error) {
      this.logger.error('Cleanup failed:', error);
    }
  }
}

module.exports = AgenticBrowser;
