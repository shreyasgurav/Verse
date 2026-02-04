import { useEffect, useState } from 'react';
import { signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import Analytics from '../utils/analytics';
import AuthPage from './AuthPage';
import SuccessPage from './SuccessPage';

interface AuthFlowProps {
  redirectUrl?: string;
}

export default function AuthFlow({ redirectUrl = '' }: AuthFlowProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authSuccess, setAuthSuccess] = useState(false);

  useEffect(() => {
    // Track page view for auth flow
    Analytics.trackPageView('/auth', 'Authentication - Verse');

    const unsubscribe = onAuthStateChanged(auth, user => {
      setUser(user);
      setLoading(false);

      if (user && !authSuccess) {
        // Track successful authentication
        Analytics.trackAuthSuccess(user.uid, user.email || '', user.displayName || '');
        setAuthSuccess(true);
      }
    });

    return () => unsubscribe();
  }, [authSuccess]);

  const handleSignIn = async () => {
    try {
      Analytics.trackAuthStart();
      Analytics.trackButtonClick('Sign in with Google', 'auth-page');

      await signInWithPopup(auth, googleProvider);

      Analytics.trackSignIn('google');

      // Set auth success state
      setAuthSuccess(true);
    } catch (error: any) {
      console.error('Authentication error:', error);
      Analytics.trackAuthError(error.message || 'Unknown authentication error');
    }
  };

  const handleSignOut = async () => {
    try {
      Analytics.trackButtonClick('Sign Out', 'auth-page');
      await signOut(auth);
      Analytics.trackSignOut();
      setAuthSuccess(false);
    } catch (error: any) {
      console.error('Sign out error:', error);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          width: '100%',
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
        }}>
        <div style={{ color: 'white', fontSize: '18px' }}>Loading...</div>
      </div>
    );
  }

  if (user && authSuccess) {
    return (
      <SuccessPage
        authData={{
          userId: user.uid,
          email: user.email || '',
          name: user.displayName || '',
          idToken: '', // Will be populated if needed
        }}
        redirectUrl={redirectUrl}
        onSignOut={handleSignOut}
      />
    );
  }

  return (
    <div
      style={{
        width: '100%',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}>
      <AuthPage onSignIn={handleSignIn} isAuthenticated={!!user} onSignOut={handleSignOut} />
    </div>
  );
}
