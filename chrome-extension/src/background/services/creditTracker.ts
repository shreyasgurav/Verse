import { createLogger } from '../log';
import {
  getUserCredits as getFirestoreCredits,
  addUsage as addFirestoreUsage,
  hasCredits as checkFirestoreCredits,
  initializeUserCredits as initFirestoreCredits,
  type UserCredits,
} from './firestoreCredits';
import { hasCreditsInCache, getCachedCredits, updateCachedCredits } from './creditCache';

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
 * Updates storage instantly, Firestore in background (non-blocking)
 * @param userId - User ID from authentication
 * @param modelName - Model name used
 * @param inputTokens - Input tokens
 * @param outputTokens - Output tokens
 */
export async function trackUsage(
  userId: string,
  modelName: string,
  inputTokens: number,
  outputTokens: number,
): Promise<void> {
  const cost = calculateCost(modelName, inputTokens, outputTokens);

  logger.info('[CreditTracker] Tracking usage:', {
    userId,
    cost: cost.toFixed(6),
  });

  // Get current credits from local storage (instant, no network)
  const result = await chrome.storage.local.get([`user_credits_${userId}`]);
  const currentCredits = result[`user_credits_${userId}`];

  if (!currentCredits) {
    logger.warning('[CreditTracker] No credits in storage, skipping tracking');
    return;
  }

  const newUsed = currentCredits.usedCreditsUSD + cost;
  const newRemaining = Math.max(0, currentCredits.totalCreditsUSD - newUsed);

  // Update chrome.storage.local FIRST for instant UI updates
  const updatedCredits = {
    userId,
    totalCreditsUSD: currentCredits.totalCreditsUSD,
    usedCreditsUSD: newUsed,
    remainingCreditsUSD: newRemaining,
    lastUpdated: Date.now(),
    createdAt: currentCredits.createdAt || Date.now(),
  };

  await chrome.storage.local.set({
    [`user_credits_${userId}`]: updatedCredits,
  });

  logger.info('[CreditTracker] ✅ Updated local storage instantly');

  // Update cache
  updateCachedCredits(userId, newUsed, currentCredits.totalCreditsUSD);

  // Update Firestore in background (don't await - fire and forget)
  addFirestoreUsage(userId, cost)
    .then(() => {
      logger.info('[CreditTracker] ✅ Firestore updated:', {
        remaining: newRemaining.toFixed(4),
      });
    })
    .catch(error => {
      logger.error('[CreditTracker] Firestore update failed (non-critical):', error);
    });
}

/**
 * Check if a user has remaining credits before making an API call
 * Reads from local storage - INSTANT, no network call
 * @param userId - User ID
 * @returns true if user has credits, false otherwise
 */
export async function checkUserHasCredits(userId: string): Promise<boolean> {
  try {
    const result = await chrome.storage.local.get([`user_credits_${userId}`]);
    const credits = result[`user_credits_${userId}`];

    if (!credits) {
      // New user, assume they have credits
      logger.info('[CreditTracker] No credits found, assuming new user has credits');
      return true;
    }

    const hasCredits = credits.remainingCreditsUSD > 0;
    logger.debug('[CreditTracker] Credit check:', {
      userId,
      remaining: credits.remainingCreditsUSD,
      hasCredits,
    });

    return hasCredits;
  } catch (error) {
    logger.error('[CreditTracker] Error checking credits:', error);
    // Fail open - allow the request
    return true;
  }
}

/**
 * Get user credits (uses cache first, then Firestore)
 * @param userId - User ID
 * @returns User credits or null if not found
 */
export async function getUserCredits(userId: string): Promise<UserCredits | null> {
  const cached = await getCachedCredits(userId);
  if (cached) {
    return {
      userId,
      totalCreditsUSD: cached.totalCreditsUSD,
      usedCreditsUSD: cached.usedCreditsUSD,
      remainingCreditsUSD: cached.remainingCreditsUSD,
      lastUpdated: Date.now(),
      createdAt: Date.now(),
    };
  }
  return await getFirestoreCredits(userId);
}

/**
 * Initialize credits for a new user
 * Saves to storage first (instant), then Firestore (async)
 * @param userId - User ID
 * @returns User credits
 */
export async function initializeUserCredits(userId: string): Promise<UserCredits> {
  // Create initial credits object
  const initialCredits: UserCredits = {
    userId,
    totalCreditsUSD: 0.5,
    usedCreditsUSD: 0,
    remainingCreditsUSD: 0.5,
    lastUpdated: Date.now(),
    createdAt: Date.now(),
  };

  // Save to chrome.storage.local FIRST for instant UI display
  await chrome.storage.local.set({ [`user_credits_${userId}`]: initialCredits });
  logger.info('[CreditTracker] ✅ Saved initial credits to local storage');

  // Update cache
  updateCachedCredits(userId, 0, 0.5);

  // Create in Firestore in background (don't block)
  initFirestoreCredits(userId)
    .then(credits => {
      logger.info('[CreditTracker] ✅ Firestore document created:', credits);
    })
    .catch(error => {
      logger.error('[CreditTracker] Firestore creation failed (non-critical):', error);
    });

  return initialCredits;
}
