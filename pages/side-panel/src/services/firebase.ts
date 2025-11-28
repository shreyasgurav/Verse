/* eslint-disable import/named */
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithCredential, signOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyBgykR-cdNenZbMyCTbaDlbl-_HiC58Pc0',
  authDomain: 'versebrowser.firebaseapp.com',
  projectId: 'versebrowser',
  storageBucket: 'versebrowser.firebasestorage.app',
  messagingSenderId: '354639393273',
  appId: '1:354639393273:web:285d0f548649a286688d28',
  measurementId: 'G-645W4D9PQV',
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const firestore = getFirestore(app);
const firebaseAuth = getAuth(app);

export const authClient = firebaseAuth;

export async function ensureFirebaseUser(idToken: string, userId: string) {
  if (!idToken) {
    throw new Error('Missing idToken for Firebase authentication');
  }

  const currentUser = firebaseAuth.currentUser;
  if (currentUser && currentUser.uid === userId) {
    return currentUser;
  }

  const credential = GoogleAuthProvider.credential(idToken);
  return signInWithCredential(firebaseAuth, credential);
}

export async function signOutFirebaseUser() {
  if (firebaseAuth.currentUser) {
    await signOut(firebaseAuth);
  }
}
