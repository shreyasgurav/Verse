import { getUserCredits as getFirestoreCredits, initializeUserCredits } from './firestoreCredits';
import { createLogger } from '../log';

const logger = createLogger('CreditCache');

/**
 * In-memory cache of user credits to avoid Firestore calls on every API request
 * Key: userId, Value: { credits, lastFetched }
 */
const creditsCache = new Map<
  string,
  {
    credits: {
      totalCreditsUSD: number;
      usedCreditsUSD: number;
      remainingCreditsUSD: number;
    };
    lastFetched: number;
  }
>();

const CACHE_TTL = 30000; // 30 seconds - refresh from Firestore every 30s

/**
 * Get credits from cache or Firestore
 * Uses cache if fresh (< 30 seconds old), otherwise fetches from Firestore
 */
export async function getCachedCredits(userId: string): Promise<{
  totalCreditsUSD: number;
  usedCreditsUSD: number;
  remainingCreditsUSD: number;
} | null> {
  const cached = creditsCache.get(userId);
  const now = Date.now();

  // Return from cache if fresh
  if (cached && now - cached.lastFetched < CACHE_TTL) {
    logger.debug('[CreditCache] Using cached credits for:', userId, 'age:', now - cached.lastFetched, 'ms');
    return cached.credits;
  }

  // Fetch from Firestore
  logger.info('[CreditCache] Fetching from Firestore for:', userId);
  try {
    let firestoreCredits = await getFirestoreCredits(userId);

    if (!firestoreCredits) {
      // Initialize if doesn't exist
      logger.info('[CreditCache] No credits found, initializing...');
      firestoreCredits = await initializeUserCredits(userId);
    }

    // Update cache
    const cacheEntry = {
      credits: {
        totalCreditsUSD: firestoreCredits.totalCreditsUSD,
        usedCreditsUSD: firestoreCredits.usedCreditsUSD,
        remainingCreditsUSD: firestoreCredits.remainingCreditsUSD,
      },
      lastFetched: now,
    };

    creditsCache.set(userId, cacheEntry);
    logger.info('[CreditCache] Cached credits for:', userId, cacheEntry.credits);

    return cacheEntry.credits;
  } catch (error) {
    logger.error('[CreditCache] Failed to fetch credits:', error);
    // Return cached value even if stale, or null
    return cached?.credits || null;
  }
}

/**
 * Update local cache when credits change
 * Call this after tracking usage to avoid unnecessary Firestore reads
 */
export function updateCachedCredits(userId: string, usedCreditsUSD: number, totalCreditsUSD: number): void {
  const cached = creditsCache.get(userId);

  const updatedCredits = {
    totalCreditsUSD,
    usedCreditsUSD,
    remainingCreditsUSD: Math.max(0, totalCreditsUSD - usedCreditsUSD),
  };

  creditsCache.set(userId, {
    credits: updatedCredits,
    lastFetched: Date.now(),
  });

  logger.debug('[CreditCache] Updated cache for:', userId, updatedCredits);
}

/**
 * Check if user has credits (uses cache)
 */
export async function hasCreditsInCache(userId: string): Promise<boolean> {
  const credits = await getCachedCredits(userId);
  if (!credits) {
    // New user, assume they have credits
    return true;
  }
  return credits.remainingCreditsUSD > 0;
}

/**
 * Clear cache for a user
 */
export function clearCreditCache(userId: string): void {
  creditsCache.delete(userId);
  logger.info('[CreditCache] Cleared cache for:', userId);
}

/**
 * Clear all cached credits
 */
export function clearAllCreditCache(): void {
  creditsCache.clear();
  logger.info('[CreditCache] Cleared all credit caches');
}
