# Authentication & Authorization

## Table of Contents
- [Overview](#overview)
- [Current Authentication Flow](#current-authentication-flow)
- [Setup Instructions](#setup-instructions)
- [Auth Website](#auth-website)
- [Extension Integration](#extension-integration)
- [Migration History](#migration-history)
- [Troubleshooting](#troubleshooting)

## Overview

Verse uses a popup-based Google authentication system via Firebase. Users can sign in with Google to use the extension with default API keys, or configure their own API keys for more control.

### Key Features

- **Popup-Based Sign-In**: No redirect loops, seamless UX
- **Firebase Authentication**: Secure Google OAuth
- **Extension Communication**: Auth data sent directly to extension
- **Optional Default API Keys**: Use shared API keys when authenticated

## Current Authentication Flow

### User Flow

1. User opens side panel → sees "Sign in with Google" button
2. Clicks button → opens auth website in new tab with `?extensionId=xxx&redirect=true`
3. Auth website detects redirect flag → automatically triggers Google sign-in popup
4. User signs in with Google → Firebase authenticates
5. Auth data sent to extension via `chrome.runtime.sendMessage`
6. Extension stores auth data → user can start using with default API keys
7. Auth website redirects to home page → shows logout button

### Technical Flow

```
Side Panel
    ↓
Click "Sign in with Google"
    ↓
Open: https://www.useverseai.com?extensionId=xxx&redirect=true
    ↓
Auth Website (App.tsx)
    ↓
Auto-trigger: signInWithPopup(auth, googleProvider)
    ↓
Google Sign-In Popup
    ↓
User authenticates
    ↓
onAuthStateChanged fires
    ↓
Send to extension: chrome.runtime.sendMessage(extensionId, {
  type: 'VERSE_AUTH_SUCCESS',
  data: { userId, email, name, idToken }
})
    ↓
Extension receives auth data
    ↓
Store in chrome.storage.local
    ↓
User authenticated ✅
```

## Setup Instructions

### 1. Firebase Configuration

Firebase is configured in `auth-website/src/firebase.ts`:

```typescript
const firebaseConfig = {
  apiKey: 'AIzaSyBgykR-cdNenZbMyCTbaDlbl-_HiC58Pc0',
  authDomain: 'versebrowser.firebaseapp.com',
  projectId: 'versebrowser',
  // ... other config
};
```

**Enable Google Sign-In:**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select the `versebrowser` project
3. Go to **Authentication** → **Sign-in method**
4. Click **Google** → Enable
5. Add authorized domains:
   - `localhost` (for development)
   - `useverseai.com` (for production)

### 2. Extension Configuration

**Extension ID:**
- Automatically passed via `?extensionId=xxx` query parameter
- Stored in `localStorage` and `sessionStorage`

**Auth Website URL:**
- Development: `http://localhost:3001`
- Production: `https://www.useverseai.com`
- Configured in extension via environment variable or hardcoded

### 3. Auth Website Setup

**Development:**
```bash
cd auth-website
npm install
npm run dev
```
Website runs on `http://localhost:3001`

**Production (Vercel):**
```bash
cd auth-website
vercel
```

No environment variables needed - Firebase config is hardcoded.

### 4. Extension Manifest

The extension manifest includes `externally_connectable`:

```javascript
externally_connectable: {
  matches: [
    'http://localhost:3001/*',
    'https://*.useverseai.com/*'
  ],
}
```

## Auth Website

### Landing Page Structure

The auth website (`auth-website/src/App.tsx`) handles:

1. **Extension ID Detection**: From URL query parameters
2. **Auto Sign-In**: When `?redirect=true` is present
3. **Auth State Management**: Tracks sign-in/sign-out
4. **Extension Communication**: Sends auth data via Chrome messaging

### Popup-Based Authentication

**Why Popup Instead of Redirect?**

- ✅ No redirect loops
- ✅ Better UX (stays on page)
- ✅ Easier state management
- ✅ No sessionStorage timing issues

**Implementation:**
```typescript
const handleGoogleSignIn = async () => {
  const result = await signInWithPopup(auth, googleProvider);
  const user = result.user;
  
  const payload = await buildAuthPayload(user);
  setAuthData(payload);
  
  // Send to extension
  sendAuthToExtension(payload, extensionId);
};
```

### Auth Payload Structure

```typescript
type AuthPayload = {
  userId: string;      // Firebase UID
  email: string;       // User email
  name: string;        // Display name
  idToken: string;     // Firebase ID token (for backend verification)
};
```

## Extension Integration

### Receiving Auth Data

The extension listens for auth messages:

```typescript
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'VERSE_AUTH_SUCCESS') {
    const { userId, email, name, idToken } = message.data;
    
    // Store in chrome.storage.local
    chrome.storage.local.set({
      userId,
      userEmail: email,
      userName: name,
      isAuthenticated: true,
      idToken
    });
    
    // Update UI
    setIsAuthenticated(true);
    setUserAuth({ userId, email, name });
  }
});
```

### Storage Keys

- `userId` - Firebase user ID
- `userEmail` - User's email address
- `userName` - User's display name
- `isAuthenticated` - Boolean flag
- `idToken` - Firebase ID token (optional, for backend)

### Sign-Out Flow

```typescript
const handleSignOut = async () => {
  // Send sign-out message to extension FIRST
  chrome.runtime.sendMessage(extensionId, {
    type: 'VERSE_AUTH_SIGNOUT'
  });
  
  // Sign out from Firebase
  await signOut(auth);
  
  // Clear local storage
  setAuthData(null);
  localStorage.removeItem('verse_extension_id');
};
```

## Migration History

### Google Auth Removal (Previous)

**What Was Removed:**
- Firebase memory sync
- Cloud storage
- Multi-device sync
- Backend API key sharing

**Why:**
- Privacy concerns
- Cost reduction
- Simplification
- User control

**Current State:**
- Local-only storage
- User-controlled API keys
- No cloud dependencies
- Optional authentication for default API keys

### Popup-Based Sign-In (Current)

**Previous Issue:**
- Redirect-based auth caused infinite loops
- SessionStorage timing problems
- Complex flag management

**Solution:**
- Switched to `signInWithPopup` instead of `signInWithRedirect`
- Eliminated redirect loops
- Simplified state management
- Better user experience

## Troubleshooting

### Issue: Sign-in popup blocked

**Solution:**
- Check browser popup settings
- Ensure auth website is in allowed domains
- Try manually opening the auth website first

### Issue: Auth data not received by extension

**Check:**
1. Extension ID is correct in URL
2. `externally_connectable` includes auth website domain
3. Extension is loaded and active
4. Check browser console for errors

**Solution:**
- Verify extension ID: `chrome.runtime.id`
- Check manifest `externally_connectable` matches auth website URL
- Reload extension if needed

### Issue: Infinite redirect loop

**This should be fixed!** If you still see it:

1. Clear browser sessionStorage
2. Clear auth website localStorage
3. Try signing in again
4. Check console for error messages

### Issue: Auth state lost on refresh

**Solution:**
- Auth state is stored in Firebase (persists)
- Extension state stored in `chrome.storage.local`
- Should persist across sessions

## Security Considerations

### Data Privacy

- Auth tokens stored locally only
- No data sent to Verse servers
- Firebase handles all authentication
- User data never leaves their browser

### API Key Security

- Default API keys (if used) should have rate limits
- Users can configure their own keys for better control
- Keys stored in extension storage (encrypted by Chrome)

### Extension Permissions

- Minimal permissions requested
- Only necessary browser APIs used
- No access to sensitive data without user action

## Future Improvements

### Potential Enhancements

1. **Multiple Auth Providers**: Support for GitHub, Microsoft, etc.
2. **Remember Me**: Optional persistent sessions
3. **Two-Factor Authentication**: Enhanced security
4. **Device Management**: View/revoke active sessions
5. **Auth Website Improvements**: Better error handling, loading states

## Summary

The current authentication system:

- ✅ Uses popup-based Google sign-in (no redirect loops)
- ✅ Sends auth data directly to extension
- ✅ Stores auth state locally
- ✅ Supports default API keys for authenticated users
- ✅ Allows users to configure their own API keys
- ✅ Privacy-first (all data local)

**Key Files:**
- `auth-website/src/App.tsx` - Auth website logic
- `auth-website/src/firebase.ts` - Firebase configuration
- `pages/side-panel/src/SidePanel.tsx` - Extension auth handling

For setup instructions, see the [Setup Instructions](#setup-instructions) section above.

