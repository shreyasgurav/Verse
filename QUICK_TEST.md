# 🚀 Quick Test - Firestore Credit Tracking

## What Was Fixed
✅ **Firestore security rules** - Now allow create/read/update  
✅ **Comprehensive logging** - See every step in console  
✅ **Error handling** - Clear error messages if something fails  

---

## Test NOW (2 minutes)

### 1. Reload Extension
```
Chrome → chrome://extensions → Find "Verse" → Click Reload (🔄)
```

### 2. Open Background Console
```
Chrome → Extensions → Verse → Click "service worker"
```
Keep this console open to see logs!

### 3. Sign In
1. Click Verse extension icon
2. Click "Sign in with Google"
3. Authenticate

**Watch background console for logs:**
```
[Firebase] Initialized on extension load
[background] Auth data stored: { userId: "...", ... }
[Credits] Starting credit initialization for user: abc123...
[Firestore] initializeUserCredits called for: abc123...
[Firestore] Got Firestore instance
[Firestore] Created doc reference: userCredits / abc123...
[Firestore] Checking if document exists...
[Firestore] Creating new credits document...
[Firestore] Writing document with data: {...}
[Firestore] ✅ Successfully created credits document for user: abc123...
[Credits] ✅ Credits successfully initialized!
[Credits] ✅ Verified credits in Firestore: {...}
```

### 4. Check Side Panel
**Should see in header:** 💳 $0.50 / $0.50

### 5. Verify in Firestore Console
1. Go to: https://console.firebase.google.com/project/versebrowser/firestore/data
2. Click **userCredits** collection
3. See your document with userId

**Document should have:**
- `totalCreditsUSD: 0.5`
- `usedCreditsUSD: 0`
- `remainingCreditsUSD: 0.5`
- `createdAt: Timestamp`
- `lastUpdated: Timestamp`

---

## If Something Goes Wrong

### Background console shows errors?
**Copy the error and check:**
- Error code (e.g., `permission-denied`, `not-found`)
- Error message
- Which step failed

**Common fixes:**
1. Reload extension
2. Sign out and sign in again
3. Check internet connection

### No document created?
**Check background console for:**
- `[Firestore] ❌` messages
- Permission denied errors
- Network errors

**If permission denied:**
```bash
cd /Users/shreyasgurav/Desktop/Verse
firebase deploy --only firestore:rules
```

### Credits not showing?
Wait 2-3 seconds, then check:
1. `chrome.storage.local` in console:
```javascript
chrome.storage.local.get(null, console.log)
```
2. Look for `user_credits_{userId}` key

---

## Success = All These ✅

- [ ] Background logs show "✅ Successfully created"
- [ ] Background logs show "✅ Verified credits"
- [ ] Side panel shows: 💳 $0.50 / $0.50
- [ ] Firestore Console shows document
- [ ] Document has correct fields
- [ ] No errors in console

---

## Next: Test Credit Deduction

1. Ask extension: "What is this page about?"
2. Wait for response
3. Check credits updated: 💳 $0.49 / $0.50
4. Refresh Firestore Console
5. See `usedCreditsUSD` increased

---

**🎉 If all checks pass, the system is working!**

