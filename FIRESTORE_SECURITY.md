# Firestore Security for Credit Tracking

## Overview

User credit tracking has been moved from `chrome.storage.local` to Firestore for enhanced security and centralized management. This prevents users from manipulating their credit data locally.

## Architecture

```
┌─────────────────┐
│  Chrome Ext.    │
│  (Background)   │──────┐
└─────────────────┘      │
                         │ Firestore API
                         │ (Write/Read)
┌─────────────────┐      │
│  Side Panel UI  │──────┤
│  (Display only) │      │
└─────────────────┘      │
                         ▼
                  ┌──────────────┐
                  │  Firestore   │
                  │  userCredits │
                  │  Collection  │
                  └──────────────┘
```

## Data Flow

1. **Credit Initialization**:
   - User signs in → Background script initializes $0.50 in Firestore
   - Document ID = `userId`
   - Path: `/userCredits/{userId}`

2. **Credit Tracking**:
   - API call made → Background tracks tokens → Calculates cost
   - Updates Firestore: `usedCreditsUSD += cost`
   - Caches to `chrome.storage.local` for UI display

3. **UI Display**:
   - Side panel reads from `chrome.storage.local` (cached copy)
   - Polls every 2 seconds for updates
   - Listens to storage change events for instant updates

## Firestore Structure

```
/userCredits/{userId}
├── totalCreditsUSD: 0.50
├── usedCreditsUSD: 0.0023
├── remainingCreditsUSD: 0.4977
├── lastUpdated: Timestamp
└── createdAt: Timestamp
```

## Security Rules

**Location**: `firestore.rules`

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /userCredits/{userId} {
      // Users can read only their own credits
      allow read: if request.auth != null && request.auth.uid == userId;
      
      // Only server/admin can write
      allow write: if false;
    }
  }
}
```

### Key Security Features

1. **Read Protection**: Users can only read their own credit data
2. **Write Protection**: Direct writes are blocked (only background script with admin SDK can write)
3. **Authentication Required**: All reads require valid Firebase auth
4. **Tamper-Proof**: Users cannot modify credits via client-side code

## Deployment

### 1. Deploy Firestore Rules

```bash
firebase deploy --only firestore:rules
```

### 2. Verify Rules in Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select `versebrowser` project
3. Navigate to **Firestore Database** → **Rules**
4. Verify rules match `firestore.rules`

### 3. Test Security

```javascript
// Should succeed (reading own credits)
const myCredits = await getDoc(doc(db, 'userCredits', myUserId));

// Should fail (reading someone else's credits)
const otherCredits = await getDoc(doc(db, 'userCredits', otherUserId));
// Error: Missing or insufficient permissions

// Should fail (writing credits)
await setDoc(doc(db, 'userCredits', myUserId), { remainingCreditsUSD: 100 });
// Error: Missing or insufficient permissions
```

## Implementation Files

- `chrome-extension/src/background/services/firebase.ts` - Firebase initialization
- `chrome-extension/src/background/services/firestoreCredits.ts` - Firestore CRUD operations
- `chrome-extension/src/background/services/creditTracker.ts` - Updated to use Firestore
- `pages/side-panel/src/SidePanel.tsx` - UI reads from cached storage

## Monitoring

### Check User Credits

```javascript
// Firebase Console → Firestore Database → userCredits collection
// Or via Firebase Admin SDK:
const creditsRef = db.collection('userCredits').doc(userId);
const snapshot = await creditsRef.get();
console.log(snapshot.data());
```

### Reset User Credits (Admin Only)

```javascript
import { resetUserCredits } from './firestoreCredits';
await resetUserCredits('userId123', 0.50);
```

## Migration Notes

- Old data in `chrome.storage.local` under key `user-credits` is now deprecated
- New data stored in Firestore at `/userCredits/{userId}`
- UI cache stored in `chrome.storage.local` as `user_credits_{userId}`
- Migration will happen automatically on first API call after update

## Security Best Practices

1. ✅ **Never expose Firebase Admin SDK credentials** in client code
2. ✅ **All credit modifications go through background script** (server-side)
3. ✅ **UI displays read-only cached data** from `chrome.storage.local`
4. ✅ **Firestore rules prevent client-side tampering**
5. ✅ **Firebase Auth required for all operations**

## Troubleshooting

### Credits not updating

- Check Firebase Console → Firestore logs
- Verify background script has Firebase initialized
- Check browser console for Firestore errors

### Permission denied errors

- Verify user is authenticated
- Check Firestore rules are deployed
- Ensure userId matches authenticated user

### Offline behavior

- Firestore has offline persistence by default
- Reads from cache when offline
- Writes queued until online
- UI shows cached credits during offline periods

