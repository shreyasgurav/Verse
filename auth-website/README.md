# Verse Auth Website

Authentication website for Verse Chrome Extension using Firebase Authentication.

## Setup

1. Install dependencies:
```bash
npm install
# or
pnpm install
```

2. Run development server:
```bash
npm run dev
# or
pnpm dev
```

The website will run on `http://localhost:3001`

## Firebase Configuration

Firebase configuration is already set up in `src/firebase.ts` with the Verse project credentials. The website uses Firebase Authentication with Google provider.

### Firebase Console Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select the `versebrowser` project
3. Go to Authentication → Sign-in method
4. Enable "Google" as a sign-in provider
5. Add authorized domains:
   - `localhost` (for development)
   - Your Vercel domain (for production, e.g., `your-domain.vercel.app`)

## Deployment

Deploy to Vercel:

```bash
vercel
```

No environment variables are required as Firebase config is hardcoded in the source.

## Usage

The extension will redirect users to this website for authentication. After successful Google sign-in via Firebase, the website will redirect back to the extension with user data (userId, email, name).

