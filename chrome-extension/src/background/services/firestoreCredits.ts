import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { getDb } from './firebase';
import { createLogger } from '../log';

const logger = createLogger('FirestoreCredits');

export interface UserCredits {
  userId: string;
  totalCreditsUSD: number; // Total credits allocated (e.g., 0.50)
  usedCreditsUSD: number; // Amount used so far
  remainingCreditsUSD: number; // Calculated: total - used
  lastUpdated: number; // Timestamp
  createdAt: number; // When credits were first allocated
}

const DEFAULT_CREDIT_LIMIT = 0.5; // $0.50 per user
const CREDITS_COLLECTION = 'userCredits';

/**
 * Initialize credits for a new user in Firestore
 */
export async function initializeUserCredits(userId: string, totalCredits = DEFAULT_CREDIT_LIMIT): Promise<UserCredits> {
  try {
    const db = getDb();
    const creditsRef = doc(db, CREDITS_COLLECTION, userId);

    // Check if user already has credits
    const creditsSnap = await getDoc(creditsRef);
    if (creditsSnap.exists()) {
      const data = creditsSnap.data();
      logger.info('[Firestore] User already has credits:', userId);
      return {
        userId,
        totalCreditsUSD: data.totalCreditsUSD,
        usedCreditsUSD: data.usedCreditsUSD,
        remainingCreditsUSD: data.remainingCreditsUSD,
        lastUpdated: data.lastUpdated,
        createdAt: data.createdAt,
      };
    }

    // Create new credits for user
    const now = Date.now();
    const userCredits: UserCredits = {
      userId,
      totalCreditsUSD: totalCredits,
      usedCreditsUSD: 0,
      remainingCreditsUSD: totalCredits,
      lastUpdated: now,
      createdAt: now,
    };

    await setDoc(creditsRef, {
      totalCreditsUSD: userCredits.totalCreditsUSD,
      usedCreditsUSD: userCredits.usedCreditsUSD,
      remainingCreditsUSD: userCredits.remainingCreditsUSD,
      lastUpdated: serverTimestamp(),
      createdAt: serverTimestamp(),
    });

    logger.info('[Firestore] Initialized credits for user:', userId, totalCredits);
    return userCredits;
  } catch (error) {
    logger.error('[Firestore] Failed to initialize user credits:', error);
    throw error;
  }
}

/**
 * Get user credits from Firestore
 */
export async function getUserCredits(userId: string): Promise<UserCredits | null> {
  try {
    const db = getDb();
    const creditsRef = doc(db, CREDITS_COLLECTION, userId);
    const creditsSnap = await getDoc(creditsRef);

    if (!creditsSnap.exists()) {
      logger.info('[Firestore] No credits found for user:', userId);
      return null;
    }

    const data = creditsSnap.data();
    return {
      userId,
      totalCreditsUSD: data.totalCreditsUSD,
      usedCreditsUSD: data.usedCreditsUSD,
      remainingCreditsUSD: data.remainingCreditsUSD,
      lastUpdated: data.lastUpdated,
      createdAt: data.createdAt,
    };
  } catch (error) {
    logger.error('[Firestore] Failed to get user credits:', error);
    throw error;
  }
}

/**
 * Add usage cost for a user in Firestore
 */
export async function addUsage(userId: string, costUSD: number): Promise<UserCredits> {
  try {
    const db = getDb();
    const creditsRef = doc(db, CREDITS_COLLECTION, userId);

    // Get current credits
    let userCredits = await getUserCredits(userId);
    if (!userCredits) {
      // Initialize if doesn't exist
      userCredits = await initializeUserCredits(userId);
    }

    // Calculate new values
    const newUsed = userCredits.usedCreditsUSD + costUSD;
    const newRemaining = Math.max(0, userCredits.totalCreditsUSD - newUsed);
    const now = Date.now();

    // Update in Firestore
    await updateDoc(creditsRef, {
      usedCreditsUSD: newUsed,
      remainingCreditsUSD: newRemaining,
      lastUpdated: serverTimestamp(),
    });

    logger.info('[Firestore] Updated credits for user:', userId, {
      cost: costUSD.toFixed(6),
      used: newUsed.toFixed(4),
      remaining: newRemaining.toFixed(4),
    });

    return {
      userId,
      totalCreditsUSD: userCredits.totalCreditsUSD,
      usedCreditsUSD: newUsed,
      remainingCreditsUSD: newRemaining,
      lastUpdated: now,
      createdAt: userCredits.createdAt,
    };
  } catch (error) {
    logger.error('[Firestore] Failed to add usage:', error);
    throw error;
  }
}

/**
 * Check if user has remaining credits
 */
export async function hasCredits(userId: string): Promise<boolean> {
  try {
    const userCredits = await getUserCredits(userId);
    if (!userCredits) {
      // New user has credits
      return true;
    }
    return userCredits.remainingCreditsUSD > 0;
  } catch (error) {
    logger.error('[Firestore] Failed to check credits:', error);
    // On error, allow the request (fail open)
    return true;
  }
}

/**
 * Reset credits for a user (admin function)
 */
export async function resetUserCredits(userId: string, totalCredits = DEFAULT_CREDIT_LIMIT): Promise<UserCredits> {
  try {
    const db = getDb();
    const creditsRef = doc(db, CREDITS_COLLECTION, userId);
    const now = Date.now();

    const userCredits: UserCredits = {
      userId,
      totalCreditsUSD: totalCredits,
      usedCreditsUSD: 0,
      remainingCreditsUSD: totalCredits,
      lastUpdated: now,
      createdAt: now,
    };

    await setDoc(creditsRef, {
      totalCreditsUSD: userCredits.totalCreditsUSD,
      usedCreditsUSD: userCredits.usedCreditsUSD,
      remainingCreditsUSD: userCredits.remainingCreditsUSD,
      lastUpdated: serverTimestamp(),
      createdAt: serverTimestamp(),
    });

    logger.info('[Firestore] Reset credits for user:', userId);
    return userCredits;
  } catch (error) {
    logger.error('[Firestore] Failed to reset user credits:', error);
    throw error;
  }
}
