interface AuthPageProps {
  onSignIn: () => void;
  isAuthenticated?: boolean;
  onSignOut?: () => void;
}

export default function AuthPage({ onSignIn, isAuthenticated, onSignOut }: AuthPageProps) {
  return (
    <div style={{
      background: 'white',
      borderRadius: '16px',
      padding: '48px',
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
      maxWidth: '400px',
      width: '100%',
      textAlign: 'center',
    }}>
      <img 
        src="/icon-128.png" 
        alt="Verse Logo" 
        style={{ width: '80px', height: '80px', marginBottom: '24px' }}
      />
      <h1 style={{ 
        fontSize: '28px', 
        fontWeight: '600', 
        color: '#1a1a1a',
        marginBottom: '12px'
      }}>
        Welcome to Verse
      </h1>
      <p style={{ 
        fontSize: '16px', 
        color: '#666',
        marginBottom: '32px'
      }}>
        {isAuthenticated ? 'You are already signed in' : 'Sign in with Google to get started'}
      </p>
      {!isAuthenticated ? (
        <button
          onClick={onSignIn}
          style={{
            width: '100%',
            padding: '12px 24px',
            fontSize: '16px',
            fontWeight: '500',
            color: 'white',
            background: '#4285f4',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            transition: 'background 0.2s',
          }}
          onMouseOver={(e) => e.currentTarget.style.background = '#357ae8'}
          onMouseOut={(e) => e.currentTarget.style.background = '#4285f4'}
        >
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Sign in with Google
        </button>
      ) : (
        onSignOut && (
          <button
            onClick={onSignOut}
            style={{
              width: '100%',
              padding: '12px 24px',
              fontSize: '16px',
              fontWeight: '500',
              color: '#666',
              background: 'transparent',
              border: '1px solid #ddd',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = '#f5f5f5';
              e.currentTarget.style.borderColor = '#999';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.borderColor = '#ddd';
            }}
          >
            Sign Out
          </button>
        )
      )}
    </div>
  );
}

