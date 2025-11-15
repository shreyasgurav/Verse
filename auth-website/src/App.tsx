import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { auth, googleProvider } from './firebase';
import LandingPage from './components/LandingPage';
import SignInPage from './components/SignInPage';
import './components/LandingPage.css';

function App() {
  const [authData, setAuthData] = useState<{ userId: string; email: string; name: string } | null>(null);

  useEffect(() => {
    // Get extension ID from query params
    const params = new URLSearchParams(window.location.search);
    const extensionId = params.get('extensionId') || '';

    // Store extension ID for later use (use localStorage to persist across tabs)
    if (extensionId) {
      localStorage.setItem('verse_extension_id', extensionId);
      sessionStorage.setItem('verse_extension_id', extensionId);
    }

    // Function to send auth data to extension
    const sendAuthToExtension = (userData: { userId: string; email: string; name: string }, extId: string) => {
      if (!extId) {
        console.warn('[Auth] No extension ID available, cannot send auth message');
        return;
      }

      if (typeof chrome === 'undefined' || !chrome.runtime) {
        console.warn('[Auth] Chrome runtime not available');
        return;
      }

      console.log('[Auth] Sending auth message to extension:', extId, userData);
      try {
        chrome.runtime.sendMessage(
          extId,
          {
            type: 'VERSE_AUTH_SUCCESS',
            data: userData,
            openSidePanel: true, // Request to open side panel
          },
          (response?: unknown) => {
            if (chrome.runtime.lastError) {
              console.error('[Auth] Error sending auth message:', chrome.runtime.lastError.message);
            } else {
              console.log('[Auth] Auth message sent successfully, response:', response);
            }
          },
        );
      } catch (error) {
        console.error('[Auth] Exception sending auth message:', error);
      }
    };

    // Check Firebase auth state
    const unsubscribe = onAuthStateChanged(auth, (user: User | null) => {
      if (user) {
        const userData = {
          userId: user.uid,
          email: user.email || '',
          name: user.displayName || user.email || '',
        };
        setAuthData(userData);

        // Send auth data to extension - try multiple sources for extensionId
        // Use a small delay to ensure extensionId is stored
        setTimeout(() => {
          const storedExtensionId =
            localStorage.getItem('verse_extension_id') ||
            sessionStorage.getItem('verse_extension_id') ||
            extensionId ||
            new URLSearchParams(window.location.search).get('extensionId') ||
            '';
          console.log('[Auth] Auth state changed, extensionId:', storedExtensionId);
          if (storedExtensionId) {
            sendAuthToExtension(userData, storedExtensionId);
          } else {
            console.warn('[Auth] No extension ID found after auth state change');
          }
        }, 100);
      } else {
        setAuthData(null);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      const userData = {
        userId: user.uid,
        email: user.email || '',
        name: user.displayName || user.email || '',
      };
      setAuthData(userData);

      // Send auth data to extension immediately after sign-in
      // Note: onAuthStateChanged will also fire and send the message, but we send here too for immediate update
      setTimeout(() => {
        const extId =
          localStorage.getItem('verse_extension_id') ||
          sessionStorage.getItem('verse_extension_id') ||
          new URLSearchParams(window.location.search).get('extensionId') ||
          '';
        console.log('[Auth] Sign-in complete, extensionId:', extId);
        if (extId) {
          // Use the same sendAuthToExtension function but we need to define it outside or inline it
          if (typeof chrome !== 'undefined' && chrome.runtime) {
            chrome.runtime.sendMessage(
              extId,
              {
                type: 'VERSE_AUTH_SUCCESS',
                data: userData,
                openSidePanel: true,
              },
              (response?: unknown) => {
                if (chrome.runtime.lastError) {
                  console.error('[Auth] Error sending auth message from sign-in:', chrome.runtime.lastError.message);
                } else {
                  console.log('[Auth] Auth message sent from sign-in, response:', response);
                }
              },
            );
          }
        } else {
          console.warn('[Auth] No extension ID found after sign-in');
        }
      }, 100);
    } catch (error: any) {
      console.error('Error signing in:', error);
      alert(error.message || 'Failed to sign in with Google');
    }
  };

  const handleSignOut = async () => {
    try {
      // Get extension ID to notify about sign out - try multiple sources
      // Priority: localStorage (persists across tabs) > sessionStorage > URL params
      let extensionId =
        localStorage.getItem('verse_extension_id') || sessionStorage.getItem('verse_extension_id') || '';
      const params = new URLSearchParams(window.location.search);
      const extIdFromParams = params.get('extensionId') || '';
      extensionId = extensionId || extIdFromParams;

      console.log('[Auth] Signing out, extensionId:', extensionId);

      // CRITICAL: Send sign-out message BEFORE signing out from Firebase
      // This ensures the extension receives the message while auth state is still valid
      if (extensionId && typeof chrome !== 'undefined' && chrome.runtime) {
        try {
          chrome.runtime.sendMessage(
            extensionId,
            {
              type: 'VERSE_AUTH_SIGNOUT',
            },
            (response?: unknown) => {
              if (chrome.runtime.lastError) {
                console.error('[Auth] Error sending sign out message:', chrome.runtime.lastError.message);
              } else {
                console.log('[Auth] Sign out message sent to extension:', response);
              }
            },
          );
        } catch (error) {
          console.error('[Auth] Error sending sign out message:', error);
        }
      } else {
        console.warn('[Auth] No extension ID found, cannot notify extension');
      }

      // Sign out from Firebase AFTER sending the message
      await signOut(auth);
      console.log('[Auth] Firebase sign out complete');

      // Clear local state and storage
      setAuthData(null);
      localStorage.removeItem('verse_extension_id');
      sessionStorage.removeItem('verse_extension_id');
    } catch (error: any) {
      console.error('[Auth] Error signing out:', error);
      alert(error.message || 'Failed to sign out');
    }
  };

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={<LandingPage isAuthenticated={!!authData} userName={authData?.name} onSignOut={handleSignOut} />}
        />
        <Route path="/signin" element={<SignInPage onSignIn={handleGoogleSignIn} />} />
      </Routes>
    </Router>
  );
}

export default App;
