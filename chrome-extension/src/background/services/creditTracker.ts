import { userCreditsStore, type UserCredits } from '@extension/storage';
import { createLogger } from '../log';

const logger = createLogger('CreditTracker');

/**
 * Pricing per 1M tokens (in USD) for various models
 * Source: OpenAI Pricing (as of Nov 2024)
 */
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  // GPT-4o models
  'gpt-4o': { input: 2.5, output: 10.0 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'gpt-4o-2024-11-20': { input: 2.5, output: 10.0 },
  'gpt-4o-2024-08-06': { input: 2.5, output: 10.0 },
  'gpt-4o-2024-05-13': { input: 5.0, output: 15.0 },
  'gpt-4o-mini-2024-07-18': { input: 0.15, output: 0.6 },

  // GPT-4 Turbo
  'gpt-4-turbo': { input: 10.0, output: 30.0 },
  'gpt-4-turbo-2024-04-09': { input: 10.0, output: 30.0 },

  // O1 models (reasoning)
  o1: { input: 15.0, output: 60.0 },
  'o1-preview': { input: 15.0, output: 60.0 },
  'o1-mini': { input: 3.0, output: 12.0 },

  // Claude models (Anthropic pricing)
  'claude-3-5-sonnet-20241022': { input: 3.0, output: 15.0 },
  'claude-3-5-sonnet-20240620': { input: 3.0, output: 15.0 },
  'claude-3-5-haiku-20241022': { input: 1.0, output: 5.0 },
  'claude-3-opus-20240229': { input: 15.0, output: 75.0 },
  'claude-3-sonnet-20240229': { input: 3.0, output: 15.0 },
  'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },

  // Gemini models (Google pricing)
  'gemini-1.5-pro': { input: 1.25, output: 5.0 },
  'gemini-1.5-flash': { input: 0.075, output: 0.3 },
  'gemini-2.0-flash-exp': { input: 0.0, output: 0.0 }, // Free during preview

  // Default fallback for unknown models (use gpt-4o-mini pricing as conservative estimate)
  default: { input: 0.15, output: 0.6 },
};

/**
 * Calculate cost for a given number of tokens
 * @param modelName - Name of the model used
 * @param inputTokens - Number of input/prompt tokens
 * @param outputTokens - Number of output/completion tokens
 * @returns Cost in USD
 */
export function calculateCost(modelName: string, inputTokens: number, outputTokens: number): number {
  // Normalize model name (remove provider prefix if present)
  const normalizedModel = modelName
    .toLowerCase()
    .replace(/^(openai|anthropic|gemini|grok|deepseek|ollama|azure|openrouter|groq|cerebras|llama|custom)-/, '');

  // Get pricing for the model (use default if not found)
  const pricing = MODEL_PRICING[normalizedModel] || MODEL_PRICING['default'];

  // Calculate cost: (tokens / 1,000,000) * price_per_million
  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;

  const totalCost = inputCost + outputCost;

  logger.debug('[CreditTracker] Cost calculation:', {
    model: modelName,
    normalizedModel,
    inputTokens,
    outputTokens,
    inputCost: inputCost.toFixed(6),
    outputCost: outputCost.toFixed(6),
    totalCost: totalCost.toFixed(6),
  });

  return totalCost;
}

/**
 * Track usage for an authenticated user
 * @param userId - User ID from authentication
 * @param modelName - Model name used
 * @param inputTokens - Input tokens
 * @param outputTokens - Output tokens
 * @returns Updated user credits
 */
export async function trackUsage(
  userId: string,
  modelName: string,
  inputTokens: number,
  outputTokens: number,
): Promise<UserCredits> {
  const cost = calculateCost(modelName, inputTokens, outputTokens);

  logger.info('[CreditTracker] Tracking usage:', {
    userId,
    modelName,
    inputTokens,
    outputTokens,
    cost: cost.toFixed(6),
  });

  // Update user credits
  const updatedCredits = await userCreditsStore.addUsage(userId, cost);

  logger.info('[CreditTracker] Updated credits:', {
    userId,
    used: updatedCredits.usedCreditsUSD.toFixed(4),
    remaining: updatedCredits.remainingCreditsUSD.toFixed(4),
    total: updatedCredits.totalCreditsUSD.toFixed(2),
  });

  return updatedCredits;
}

/**
 * Check if a user has remaining credits before making an API call
 * @param userId - User ID
 * @returns true if user has credits, false otherwise
 */
export async function checkUserHasCredits(userId: string): Promise<boolean> {
  return await userCreditsStore.hasCredits(userId);
}

/**
 * Get user credits
 * @param userId - User ID
 * @returns User credits or null if not found
 */
export async function getUserCredits(userId: string): Promise<UserCredits | null> {
  return await userCreditsStore.getUserCredits(userId);
}

/**
 * Initialize credits for a new user
 * @param userId - User ID
 * @returns User credits
 */
export async function initializeUserCredits(userId: string): Promise<UserCredits> {
  return await userCreditsStore.initializeUser(userId);
}
