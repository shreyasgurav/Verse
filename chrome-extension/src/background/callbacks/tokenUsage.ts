import { BaseCallbackHandler } from '@langchain/core/callbacks/base';
import { updateUserCredits } from '../services/credits';

/**
 * Model pricing in USD per token
 * Updated as of November 2024
 */
const MODEL_PRICING: Record<
  string,
  {
    input: number; // USD per input token
    output: number; // USD per output token
  }
> = {
  'gpt-4o-mini': {
    input: 0.00000015, // $0.150 / 1M tokens
    output: 0.0000006, // $0.600 / 1M tokens
  },
  'gpt-4o': {
    input: 0.0000025, // $2.50 / 1M tokens
    output: 0.00001, // $10.00 / 1M tokens
  },
  'gpt-4-turbo': {
    input: 0.00001, // $10.00 / 1M tokens
    output: 0.00003, // $30.00 / 1M tokens
  },
  'gpt-4': {
    input: 0.00003, // $30.00 / 1M tokens
    output: 0.00006, // $60.00 / 1M tokens
  },
  'gpt-3.5-turbo': {
    input: 0.0000005, // $0.50 / 1M tokens
    output: 0.0000015, // $1.50 / 1M tokens
  },
};

/**
 * LangChain callback handler to track token usage and update user credits
 */
export class TokenUsageCallbackHandler extends BaseCallbackHandler {
  name = 'token_usage_tracker';

  constructor(
    private userId: string,
    private modelName: string,
  ) {
    super();
    console.log('[TokenCallback] Initialized for user:', userId, 'model:', modelName);
  }

  /**
   * Called when LLM completes
   */
  async handleLLMEnd(output: any): Promise<void> {
    try {
      // Extract token usage from LLM output
      const usage = output?.llmOutput?.tokenUsage;

      if (!usage) {
        console.warn('[TokenCallback] No token usage in LLM response');
        return;
      }

      const promptTokens = usage.promptTokens || 0;
      const completionTokens = usage.completionTokens || 0;
      const totalTokens = usage.totalTokens || promptTokens + completionTokens;

      console.log('[TokenCallback] Token usage:', {
        model: this.modelName,
        prompt: promptTokens,
        completion: completionTokens,
        total: totalTokens,
      });

      // Calculate cost
      const cost = this.calculateCost(promptTokens, completionTokens);

      if (cost > 0) {
        console.log('[TokenCallback] Calculated cost:', `$${cost.toFixed(6)}`);

        // Update user credits in Firestore
        await updateUserCredits(this.userId, cost);
      } else {
        console.warn('[TokenCallback] Cost is zero, skipping credit update');
      }
    } catch (error) {
      console.error('[TokenCallback] Error tracking token usage:', error);
      // Don't throw - we don't want to break the main flow
    }
  }

  /**
   * Calculate cost based on token usage and model pricing
   */
  private calculateCost(promptTokens: number, completionTokens: number): number {
    // Get pricing for this model, fallback to gpt-4o-mini if not found
    const pricing = MODEL_PRICING[this.modelName] || MODEL_PRICING['gpt-4o-mini'];

    const inputCost = promptTokens * pricing.input;
    const outputCost = completionTokens * pricing.output;
    const totalCost = inputCost + outputCost;

    // Round to 6 decimal places to avoid floating point issues
    return Math.round(totalCost * 1000000) / 1000000;
  }

  /**
   * Called when LLM encounters an error
   */
  async handleLLMError(error: Error): Promise<void> {
    console.warn('[TokenCallback] LLM error occurred, no credits charged:', error.message);
    // Don't charge credits for failed calls
  }
}
