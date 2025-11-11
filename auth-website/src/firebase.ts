import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

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
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth = getAuth(app);

// Initialize Google Auth Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

export default app;
