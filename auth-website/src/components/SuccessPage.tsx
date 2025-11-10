import { useEffect, useState } from 'react';

interface SuccessPageProps {
  authData: { userId: string; email: string; name: string };
  redirectUrl: string;
  onSignOut?: () => void;
}

export default function SuccessPage({ authData, redirectUrl, onSignOut }: SuccessPageProps) {
  const [countdown, setCountdown] = useState(2);
  const [message, setMessage] = useState('Redirecting back to Verse...');
  const [showSignOut, setShowSignOut] = useState(false);

  useEffect(() => {
    // Get extension ID from storage (try localStorage first, then sessionStorage) or redirect URL
    let extensionId = localStorage.getItem('verse_extension_id') || 
                     sessionStorage.getItem('verse_extension_id');
    if (!extensionId && redirectUrl && redirectUrl.startsWith('chrome-extension://')) {
      extensionId = redirectUrl.split('://')[1]?.split('/')[0] || null;
    }
    
    // Send auth data to extension and request to open side panel
    if (extensionId && typeof chrome !== 'undefined' && chrome.runtime) {
      try {
        chrome.runtime.sendMessage(
          extensionId,
          {
            type: 'VERSE_AUTH_SUCCESS',
            data: authData,
            openSidePanel: true, // Request to open side panel
          },
          (response?: unknown) => {
            if (chrome.runtime.lastError) {
              console.log('Extension message error:', chrome.runtime.lastError.message);
              setMessage('Authentication successful! Please return to Verse and open the side panel.');
            } else {
              console.log('Message sent to extension:', response);
              setMessage('Opening Verse side panel...');
            }
          }
        );
      } catch (error) {
        console.error('Error sending message to extension:', error);
        setMessage('Authentication successful! Please return to Verse and open the side panel.');
      }
    } else {
      setMessage('Authentication successful! Please return to Verse and open the side panel.');
    }

    // Show sign out button after a delay (if tab doesn't close)
    const signOutTimer = setTimeout(() => {
      setShowSignOut(true);
    }, 3000);

    // Countdown timer to close the tab
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Close the tab after countdown
          window.close();
          // If window.close() doesn't work, show a message and sign out button
          setTimeout(() => {
            setMessage('Authentication successful! You can close this tab and return to Verse.');
            setShowSignOut(true);
          }, 500);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
      clearTimeout(signOutTimer);
    };
  }, [authData, redirectUrl]);

  return (
    <div style={{
      width: '100%',
      minHeight: '100vh',
      background: '#ffffff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '24px',
        padding: '64px',
        border: '1px solid rgba(0, 0, 0, 0.06)',
        maxWidth: '500px',
        width: '100%',
        textAlign: 'center',
      }}>
        <div style={{ 
          fontSize: '64px', 
          marginBottom: '24px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>✓</div>
        <h1 style={{ 
          fontSize: '32px', 
          fontWeight: '700', 
          color: '#000',
          marginBottom: '16px',
          letterSpacing: '-0.02em'
        }}>
          Sign In Successful!
        </h1>
        <p style={{ 
          fontSize: '18px', 
          color: '#666',
          marginBottom: '32px'
        }}>
          Welcome, {authData.name}
        </p>
        {message && (
          <p style={{ 
            fontSize: '16px', 
            color: '#667eea',
            marginBottom: '24px',
            fontWeight: '500'
          }}>
            {message}
          </p>
        )}
        {countdown > 0 && !showSignOut && (
          <p style={{ 
            fontSize: '14px', 
            color: '#999'
          }}>
            Closing in {countdown}...
          </p>
        )}
        {showSignOut && onSignOut && (
          <button
            onClick={onSignOut}
            style={{
              marginTop: '16px',
              padding: '12px 32px',
              fontSize: '16px',
              fontWeight: '600',
              color: '#000',
              background: 'transparent',
              border: '2px solid rgba(0, 0, 0, 0.2)',
              borderRadius: '24px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'rgba(0, 0, 0, 0.02)';
              e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.4)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.2)';
            }}
          >
            Sign Out
          </button>
        )}
      </div>
    </div>
  );
}

