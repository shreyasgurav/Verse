# Google Authentication Setup for Verse

This guide explains how to set up Google authentication for Verse, allowing users to sign in and use the extension with default API keys.

## Overview

**Flow:**
1. User opens side panel → sees "Sign in with Google" button
2. Clicks button → opens auth website (localhost:3001 or useverseai.com)
3. Signs in with Google via Firebase → auth data sent to extension
4. Side panel opens automatically → user can start chatting with gpt-4o-mini
5. Users can optionally configure their own API keys in settings

## Setup Steps

### 1. Firebase Configuration

Firebase is already configured in `auth-website/src/firebase.ts` with your credentials.

**Enable Google Sign-In:**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select the `versebrowser` project
3. Go to **Authentication** → **Sign-in method**
4. Click **Google** → Enable
5. Add authorized domains:
   - `localhost` (for development)
   - `useverseai.com` (for production)

### 2. Extension Configuration

**Add your OpenAI API key:**

Create a `.env.local` file in the project root:

```bash
# Your OpenAI API key (used for authenticated users who haven't configured their own)
VITE_DEFAULT_OPENAI_API_KEY=sk-your-api-key-here

# Auth website URL
VITE_AUTH_WEBSITE_URL=http://localhost:3001  # For development
# VITE_AUTH_WEBSITE_URL=https://useverseai.com  # For production
```

**Important:** This API key will be used by all authenticated users who haven't configured their own API keys. Monitor usage and set rate limits as needed.

### 3. Auth Website Setup

**Development:**

```bash
cd auth-website
npm install
npm run dev
```

The website will run on `http://localhost:3001`

**Production (Vercel):**

```bash
cd auth-website
vercel
```

No environment variables needed for the auth website (Firebase config is hardcoded).

### 4. Extension Manifest

The extension manifest already includes `externally_connectable` for:
- `http://localhost:3001/*` (development)
- `https://*.useverseai.com/*` (production)

If you deploy to a different domain, update `chrome-extension/manifest.js`:

```javascript
externally_connectable: {
  matches: ['http://localhost:3001/*', 'https://your-domain.com/*'],
},
```

### 5. Build and Test

```bash
# Build the extension
pnpm build

# Load the extension in Chrome
1. Open chrome://extensions/
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `dist/` directory
```

## How It Works

### Authentication Flow

1. **User clicks "Sign in with Google"**
   - Opens auth website in a new tab with `?extensionId=xxx`
   - Auth website stores extension ID in sessionStorage

2. **User signs in with Firebase**
   - Firebase handles Google OAuth
   - Success page sends message to extension via `chrome.runtime.sendMessage()`

3. **Extension receives auth data**
   - Background script stores: `userId`, `userEmail`, `userName`, `isAuthenticated: true`
   - Opens side panel automatically
   - Notifies side panel about successful auth

4. **Side panel detects auth**
   - Polls `chrome.storage.local` every second
   - Listens for `chrome.storage.onChanged` events
   - Updates UI when auth is detected

### Default API Key Usage

When a user is authenticated:

1. **Side panel check** (`checkModelConfiguration`):
   - If `isAuthenticated === true` → allows access (sets `hasConfiguredModels = true`)
   - User can start chatting immediately

2. **Background script** (`setupExecutor`):
   - If authenticated and no providers configured → uses `VITE_DEFAULT_OPENAI_API_KEY`
   - Creates default provider config with `gpt-4o-mini`
   - Sets up Navigator and Planner agents with default config

3. **Summarize function** (`summarizePage`):
   - Same logic: checks auth → uses default API key if needed

### User's Own API Keys

Users can still configure their own API keys:
- Go to Settings → Configure providers and models
- Once configured, their API keys take precedence over default
- Authenticated users can switch between default and their own keys

## Security Considerations

1. **API Key Protection:**
   - Default API key is in `.env.local` (git-ignored)
   - Only accessible to extension code, not exposed to web pages
   - Monitor usage and set OpenAI rate limits

2. **Firebase Security:**
   - Use Firebase Security Rules to restrict Firestore access
   - Only authenticated users can read/write their own data

3. **Extension Permissions:**
   - `externally_connectable` limits which websites can message the extension
   - Only localhost:3001 and useverseai.com can send auth messages

## Production Deployment

### Auth Website (Vercel)

```bash
cd auth-website
vercel --prod
```

Set the domain in your `.env.local`:
```bash
VITE_AUTH_WEBSITE_URL=https://useverseai.com
```

### Extension (Chrome Web Store)

1. Build: `pnpm build`
2. Zip: `pnpm zip`
3. Upload to Chrome Web Store
4. Update `externally_connectable` if using a different domain

## Troubleshooting

### "ERR_BLOCKED_BY_CLIENT" Error
- Chrome blocks redirects to `chrome-extension://` URLs
- Solution: Auth website sends message instead of redirecting
- Side panel polls for auth data and opens automatically

### Auth Not Detected
- Check browser console for errors
- Verify Firebase is enabled for Google sign-in
- Check that `externally_connectable` includes your auth website domain
- Ensure extension ID matches in the auth website URL

### API Key Not Working
- Verify `VITE_DEFAULT_OPENAI_API_KEY` is set in `.env.local`
- Check OpenAI API key is valid and has credits
- Monitor OpenAI dashboard for usage and errors

## Support

For issues or questions:
1. Check browser console logs (extension and auth website)
2. Check background script logs: `chrome://extensions` → Verse → "service worker" → Console
3. Verify Firebase Console for authentication logs






