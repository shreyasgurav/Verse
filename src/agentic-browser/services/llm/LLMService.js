/**
 * LLM Service for planning and decision making
 * Handles communication with various LLM providers
 */

const CONFIG = require('../../config/index.js');
const { ActionPlan, Task, ACTION_TYPES } = require('../../types/index.js');
const Logger = require('../../utils/logging/Logger.js').Logger;
const OpenAI = require('openai');

class LLMService {
  constructor() {
    this.logger = new Logger('LLMService');
    this.client = null;
    this.initializeClient();
  }

  initializeClient() {
    try {
      if (CONFIG.LLM.PROVIDER === 'openai') {
        this.client = new OpenAI({
          apiKey: CONFIG.LLM.API_KEY,
          timeout: CONFIG.LLM.TIMEOUT,
          maxRetries: CONFIG.LLM.MAX_RETRIES
        });
        this.logger.info('OpenAI client initialized');
      } else {
        throw new Error(`Unsupported LLM provider: ${CONFIG.LLM.PROVIDER}`);
      }
    } catch (error) {
      this.logger.error('Failed to initialize LLM client:', error);
      throw error;
    }
  }

  /**
   * Generate action plan from user goal
   */
  async generateActionPlan(goal, currentState = null, context = {}) {
    try {
      this.logger.info(`Generating action plan for goal: ${goal}`);

      const systemPrompt = this.getSystemPrompt();
      const userPrompt = this.buildUserPrompt(goal, currentState, context);

      const response = await this.client.chat.completions.create({
        model: CONFIG.LLM.MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: CONFIG.LLM.MAX_TOKENS,
        temperature: CONFIG.LLM.TEMPERATURE
      });

      const planJson = this.parsePlanResponse(response.choices[0].message.content);
      const actionPlan = this.createActionPlan(planJson, goal, context);

      this.logger.info(`Generated action plan with ${actionPlan.steps.length} steps`);
      return actionPlan;
    } catch (error) {
      this.logger.error('Failed to generate action plan:', error);
      throw error;
    }
  }

  /**
   * Refine action plan based on current state
   */
  async refineActionPlan(plan, currentState, lastActionResult = null) {
    try {
      this.logger.info(`Refining action plan based on current state`);

      const systemPrompt = this.getRefinementPrompt();
      const userPrompt = this.buildRefinementPrompt(plan, currentState, lastActionResult);

      const response = await this.client.chat.completions.create({
        model: CONFIG.LLM.MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: CONFIG.LLM.MAX_TOKENS,
        temperature: CONFIG.LLM.TEMPERATURE
      });

      const refinedPlanJson = this.parsePlanResponse(response.choices[0].message.content);
      const refinedPlan = this.createActionPlan(refinedPlanJson, plan.goal, plan.context);

      this.logger.info(`Refined action plan with ${refinedPlan.steps.length} steps`);
      return refinedPlan;
    } catch (error) {
      this.logger.error('Failed to refine action plan:', error);
      return plan; // Return original plan on error
    }
  }

  /**
   * Generate selector for an element based on description
   */
  async generateSelector(elementDescription, pageContext = null) {
    try {
      this.logger.debug(`Generating selector for: ${elementDescription}`);

      const systemPrompt = this.getSelectorPrompt();
      const userPrompt = this.buildSelectorPrompt(elementDescription, pageContext);

      const response = await this.client.chat.completions.create({
        model: CONFIG.LLM.MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 1000,
        temperature: 0.1
      });

      const selectorJson = this.parseSelectorResponse(response.choices[0].message.content);
      return selectorJson;
    } catch (error) {
      this.logger.error('Failed to generate selector:', error);
      return null;
    }
  }

  getSystemPrompt() {
    return `You are an expert web automation agent that breaks down user goals into actionable browser tasks.

Your job is to create detailed, step-by-step action plans that can be executed by a browser automation system.

Available actions:
- navigate: Navigate to a URL
- click: Click on an element
- type: Type text into an input field
- scroll: Scroll the page
- wait: Wait for a condition
- verify: Verify a condition is met
- evaluate: Execute JavaScript code

Response format (JSON only):
{
  "steps": [
    {
      "action": "action_type",
      "description": "Human readable description",
      "args": {
        "param1": "value1",
        "param2": "value2"
      },
      "selector": "CSS selector if applicable",
      "verification": {
        "method": "verification_method",
        "expected": "expected_result"
      },
      "retryCount": 3,
      "timeout": 30000
    }
  ],
  "context": {
    "currentUrl": "current_url",
    "expectedOutcome": "what_should_happen"
  }
}

Guidelines:
1. Be specific with selectors - prefer data attributes, IDs, then CSS selectors
2. Include verification steps to confirm actions succeeded
3. Break complex tasks into smaller, atomic actions
4. Consider error handling and retry logic
5. Always verify navigation and state changes
6. Use realistic timeouts and delays

Return only valid JSON, no additional text.`;
  }

  buildUserPrompt(goal, currentState, context) {
    let prompt = `User Goal: ${goal}\n\n`;

    if (currentState) {
      prompt += `Current State:\n`;
      prompt += `- URL: ${currentState.url}\n`;
      prompt += `- Title: ${currentState.title}\n`;
      prompt += `- Viewport: ${JSON.stringify(currentState.viewport)}\n`;
      
      if (currentState.domSnapshot) {
        prompt += `- Page has ${currentState.domSnapshot.root?.childNodeCount || 0} child nodes\n`;
      }
    }

    if (context && Object.keys(context).length > 0) {
      prompt += `\nAdditional Context:\n${JSON.stringify(context, null, 2)}\n`;
    }

    prompt += `\nGenerate a detailed action plan to achieve this goal.`;
    
    return prompt;
  }

  getRefinementPrompt() {
    return `You are an expert web automation agent that refines action plans based on current state and previous results.

Your job is to adjust an existing action plan based on:
1. Current page state
2. Results of previous actions
3. Any errors or unexpected outcomes

Response format (JSON only):
{
  "steps": [
    {
      "action": "action_type",
      "description": "Human readable description",
      "args": {
        "param1": "value1"
      },
      "selector": "CSS selector if applicable",
      "verification": {
        "method": "verification_method",
        "expected": "expected_result"
      }
    }
  ],
  "adjustments": "Description of what was adjusted and why"
}

Guidelines:
1. Keep successful steps unchanged
2. Modify failed or problematic steps
3. Add new steps if needed
4. Update selectors if elements have changed
5. Adjust verification methods if needed
6. Provide clear reasoning for changes

Return only valid JSON, no additional text.`;
  }

  buildRefinementPrompt(plan, currentState, lastActionResult) {
    let prompt = `Current Action Plan:\n${JSON.stringify(plan, null, 2)}\n\n`;

    prompt += `Current State:\n`;
    prompt += `- URL: ${currentState.url}\n`;
    prompt += `- Title: ${currentState.title}\n`;

    if (lastActionResult) {
      prompt += `\nLast Action Result:\n`;
      prompt += `- Action: ${lastActionResult.action}\n`;
      prompt += `- Success: ${lastActionResult.success}\n`;
      if (lastActionResult.error) {
        prompt += `- Error: ${lastActionResult.error}\n`;
      }
    }

    prompt += `\nRefine the action plan based on the current state and any issues encountered.`;
    
    return prompt;
  }

  getSelectorPrompt() {
    return `You are an expert at generating CSS selectors for web elements.

Given an element description, generate the most reliable CSS selector.

Response format (JSON only):
{
  "selectors": [
    {
      "selector": "css_selector",
      "strategy": "data_attribute|id|css_selector|xpath|accessibility",
      "confidence": 0.9,
      "description": "Why this selector was chosen"
    }
  ],
  "fallback": {
    "description": "What to do if primary selector fails",
    "alternative_approach": "Alternative method to find element"
  }
}

Guidelines:
1. Prefer data attributes (data-testid, data-test, etc.)
2. Use IDs if they're stable and unique
3. Use semantic CSS selectors
4. Consider accessibility attributes (aria-label, role)
5. Rank selectors by reliability and confidence
6. Provide fallback strategies

Return only valid JSON, no additional text.`;
  }

  buildSelectorPrompt(elementDescription, pageContext) {
    let prompt = `Element Description: ${elementDescription}\n\n`;

    if (pageContext) {
      prompt += `Page Context:\n`;
      prompt += `- URL: ${pageContext.url}\n`;
      prompt += `- Title: ${pageContext.title}\n`;
      
      if (pageContext.domSnapshot) {
        prompt += `- Available elements: ${JSON.stringify(pageContext.domSnapshot, null, 2)}\n`;
      }
    }

    prompt += `\nGenerate reliable CSS selectors for this element.`;
    
    return prompt;
  }

  parsePlanResponse(content) {
    try {
      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('No JSON found in response');
    } catch (error) {
      this.logger.error('Failed to parse plan response:', error);
      throw new Error(`Invalid plan response: ${error.message}`);
    }
  }

  parseSelectorResponse(content) {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('No JSON found in response');
    } catch (error) {
      this.logger.error('Failed to parse selector response:', error);
      return null;
    }
  }

  createActionPlan(planJson, goal, context) {
    const steps = planJson.steps.map((step, index) => {
      return new Task({
        id: `step_${index + 1}`,
        action: step.action,
        args: step.args || {},
        selector: step.selector,
        verification: step.verification,
        retryCount: step.retryCount || 3,
        maxRetries: step.maxRetries || 3,
        timeout: step.timeout || 30000,
        priority: index
      });
    });

    return new ActionPlan({
      id: `plan_${Date.now()}`,
      goal,
      steps,
      context: { ...context, ...planJson.context }
    });
  }

  /**
   * Validate action plan for safety
   */
  validateActionPlan(plan) {
    const errors = [];

    // Check for dangerous actions
    const dangerousActions = ['evaluate'];
    const dangerousSteps = plan.steps.filter(step => 
      dangerousActions.includes(step.action) && 
      step.args.code && 
      !this.isSafeCode(step.args.code)
    );

    if (dangerousSteps.length > 0) {
      errors.push('Plan contains potentially unsafe code execution');
    }

    // Check for blocked domains
    const navigationSteps = plan.steps.filter(step => step.action === 'navigate');
    for (const step of navigationSteps) {
      if (this.isBlockedDomain(step.args.url)) {
        errors.push(`Navigation to blocked domain: ${step.args.url}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  isSafeCode(code) {
    // Basic safety check - in production, use more sophisticated analysis
    const dangerousPatterns = [
      /eval\s*\(/,
      /Function\s*\(/,
      /setTimeout\s*\(/,
      /setInterval\s*\(/,
      /document\.write/,
      /window\.location\.href\s*=/,
      /localStorage\.clear/,
      /sessionStorage\.clear/
    ];

    return !dangerousPatterns.some(pattern => pattern.test(code));
  }

  isBlockedDomain(url) {
    try {
      const domain = new URL(url).hostname;
      return CONFIG.SAFETY.BLOCKED_DOMAINS.some(blocked => 
        domain.includes(blocked) || domain.endsWith(blocked)
      );
    } catch {
      return true; // Block invalid URLs
    }
  }
}

module.exports = LLMService;
