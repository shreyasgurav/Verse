import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { createLogger } from '../log';

const logger = createLogger('Firebase');

const firebaseConfig = {
  apiKey: 'AIzaSyBgykR-cdNenZbMyCTbaDlbl-_HiC58Pc0',
  authDomain: 'versebrowser.firebaseapp.com',
  projectId: 'versebrowser',
  storageBucket: 'versebrowser.firebasestorage.app',
  messagingSenderId: '354639393273',
  appId: '1:354639393273:web:285d0f548649a286688d28',
  measurementId: 'G-645W4D9PQV',
};

// Initialize Firebase
let app: ReturnType<typeof initializeApp> | null = null;
let db: ReturnType<typeof getFirestore> | null = null;

/**
 * Initialize Firebase and Firestore
 * Safe to call multiple times - will only initialize once
 */
export function initializeFirebase() {
  if (!app) {
    try {
      app = initializeApp(firebaseConfig);
      db = getFirestore(app);
      logger.info('[Firebase] Initialized successfully');
    } catch (error) {
      logger.error('[Firebase] Failed to initialize:', error);
      throw error;
    }
  }
  return { app, db: db! };
}

/**
 * Get Firestore instance
 * Initializes if not already done
 */
export function getDb() {
  if (!db) {
    initializeFirebase();
  }
  return db!;
}
