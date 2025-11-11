import type { BaseStorage } from '../base/types';
import { createStorage } from '../base/base';
import { StorageEnum } from '../base/enums';

/**
 * User credit tracking for API usage
 * Tracks usage when users are authenticated and using default API keys
 */
export interface UserCredits {
  userId: string;
  totalCreditsUSD: number; // Total credits allocated (e.g., 0.50)
  usedCreditsUSD: number; // Amount used so far
  remainingCreditsUSD: number; // Calculated: total - used
  lastUpdated: number; // Timestamp
  createdAt: number; // When credits were first allocated
}

export interface UserCreditsStorage extends BaseStorage<Record<string, UserCredits>> {
  /**
   * Initialize credits for a new user
   */
  initializeUser(userId: string, totalCredits?: number): Promise<UserCredits>;

  /**
   * Get credits for a specific user
   */
  getUserCredits(userId: string): Promise<UserCredits | null>;

  /**
   * Add usage cost for a user
   */
  addUsage(userId: string, costUSD: number): Promise<UserCredits>;

  /**
   * Check if user has remaining credits
   */
  hasCredits(userId: string): Promise<boolean>;

  /**
   * Reset credits for a user
   */
  resetUserCredits(userId: string, totalCredits?: number): Promise<UserCredits>;

  /**
   * Get all users' credits
   */
  getAllCredits(): Promise<Record<string, UserCredits>>;
}

const DEFAULT_CREDIT_LIMIT = 0.5; // $0.50 per user

const storage = createStorage<Record<string, UserCredits>>(
  'user-credits',
  {},
  {
    storageEnum: StorageEnum.Local,
    liveUpdate: true,
  },
);

export const userCreditsStore: UserCreditsStorage = {
  ...storage,

  async initializeUser(userId: string, totalCredits = DEFAULT_CREDIT_LIMIT): Promise<UserCredits> {
    const allCredits = (await storage.get()) || {};

    // Check if user already has credits
    if (allCredits[userId]) {
      return allCredits[userId];
    }

    // Create new credits for user
    const userCredits: UserCredits = {
      userId,
      totalCreditsUSD: totalCredits,
      usedCreditsUSD: 0,
      remainingCreditsUSD: totalCredits,
      lastUpdated: Date.now(),
      createdAt: Date.now(),
    };

    allCredits[userId] = userCredits;
    await storage.set(allCredits);

    return userCredits;
  },

  async getUserCredits(userId: string): Promise<UserCredits | null> {
    const allCredits = (await storage.get()) || {};
    return allCredits[userId] || null;
  },

  async addUsage(userId: string, costUSD: number): Promise<UserCredits> {
    const allCredits = (await storage.get()) || {};
    let userCredits = allCredits[userId];

    if (!userCredits) {
      // Initialize if doesn't exist
      userCredits = await this.initializeUser(userId);
    }

    // Update usage
    userCredits.usedCreditsUSD += costUSD;
    userCredits.remainingCreditsUSD = Math.max(0, userCredits.totalCreditsUSD - userCredits.usedCreditsUSD);
    userCredits.lastUpdated = Date.now();

    allCredits[userId] = userCredits;
    await storage.set(allCredits);

    return userCredits;
  },

  async hasCredits(userId: string): Promise<boolean> {
    const userCredits = await this.getUserCredits(userId);
    if (!userCredits) {
      // New user has credits
      return true;
    }
    return userCredits.remainingCreditsUSD > 0;
  },

  async resetUserCredits(userId: string, totalCredits = DEFAULT_CREDIT_LIMIT): Promise<UserCredits> {
    const allCredits = (await storage.get()) || {};

    const userCredits: UserCredits = {
      userId,
      totalCreditsUSD: totalCredits,
      usedCreditsUSD: 0,
      remainingCreditsUSD: totalCredits,
      lastUpdated: Date.now(),
      createdAt: Date.now(),
    };

    allCredits[userId] = userCredits;
    await storage.set(allCredits);

    return userCredits;
  },

  async getAllCredits(): Promise<Record<string, UserCredits>> {
    return (await storage.get()) || {};
  },
};
