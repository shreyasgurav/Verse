import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, updateDoc, increment } from 'firebase/firestore';

// Firebase config (same as auth-website)
const firebaseConfig = {
  apiKey: 'AIzaSyBgykR-cdNenZbMyCTbaDlbl-_HiC58Pc0',
  authDomain: 'versebrowser.firebaseapp.com',
  projectId: 'versebrowser',
  storageBucket: 'versebrowser.firebasestorage.app',
  messagingSenderId: '354639393273',
  appId: '1:354639393273:web:285d0f548649a286688d28',
  measurementId: 'G-645W4D9PQV',
};

// Initialize Firebase app for credits (separate instance)
let app: ReturnType<typeof initializeApp>;
let db: ReturnType<typeof getFirestore>;

try {
  app = initializeApp(firebaseConfig, 'credits-app');
  db = getFirestore(app);
  console.log('[Credits] Firebase initialized');
} catch (error) {
  console.error('[Credits] Failed to initialize Firebase:', error);
}

export interface UserCredits {
  userId: string;
  totalCredits: number;
  usedCredits: number;
  remainingCredits: number;
  lastUpdated: number;
  createdAt: number;
}

/**
 * Initialize credits for a new user
 */
export async function initializeUserCredits(userId: string): Promise<UserCredits> {
  try {
    const userRef = doc(db, 'userCredits', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      const newCredits: UserCredits = {
        userId,
        totalCredits: 0.5, // $0.50 in credits
        usedCredits: 0.0,
        remainingCredits: 0.5,
        lastUpdated: Date.now(),
        createdAt: Date.now(),
      };

      await setDoc(userRef, newCredits);
      console.log('[Credits] Initialized credits for user:', userId, '$0.50');
      return newCredits;
    }

    return userDoc.data() as UserCredits;
  } catch (error) {
    console.error('[Credits] Failed to initialize user credits:', error);
    throw error;
  }
}

/**
 * Get user's current credit balance
 */
export async function getUserCredits(userId: string): Promise<UserCredits> {
  try {
    const userRef = doc(db, 'userCredits', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      // Initialize if doesn't exist
      return await initializeUserCredits(userId);
    }

    return userDoc.data() as UserCredits;
  } catch (error) {
    console.error('[Credits] Failed to get user credits:', error);
    throw error;
  }
}

/**
 * Update user credits after API usage
 */
export async function updateUserCredits(userId: string, cost: number): Promise<void> {
  try {
    const userRef = doc(db, 'userCredits', userId);

    // Round cost to 6 decimal places
    const roundedCost = Math.round(cost * 1000000) / 1000000;

    await updateDoc(userRef, {
      usedCredits: increment(roundedCost),
      remainingCredits: increment(-roundedCost),
      lastUpdated: Date.now(),
    });

    console.log('[Credits] Updated user credits:', userId, 'cost:', `$${roundedCost.toFixed(6)}`);

    // Get updated credits and broadcast to extension
    const updatedCredits = await getUserCredits(userId);

    // Send update to all side panels
    chrome.runtime
      .sendMessage({
        type: 'CREDITS_UPDATED',
        data: updatedCredits,
      })
      .catch(() => {
        // Ignore if no listeners
        console.debug('[Credits] No listeners for credit update');
      });
  } catch (error) {
    console.error('[Credits] Failed to update user credits:', error);
    throw error;
  }
}

/**
 * Check if user has sufficient credits
 */
export async function checkUserCredits(userId: string): Promise<{
  hasCredits: boolean;
  remainingCredits: number;
  totalCredits: number;
  usedCredits: number;
}> {
  try {
    const credits = await getUserCredits(userId);

    return {
      hasCredits: credits.remainingCredits > 0,
      remainingCredits: credits.remainingCredits,
      totalCredits: credits.totalCredits,
      usedCredits: credits.usedCredits,
    };
  } catch (error) {
    console.error('[Credits] Failed to check user credits:', error);
    // Return no credits on error to be safe
    return {
      hasCredits: false,
      remainingCredits: 0,
      totalCredits: 0.5,
      usedCredits: 0,
    };
  }
}
