# Testing Firestore Credit Tracking System

## Prerequisites
✅ Firestore database created in Firebase Console  
✅ Firestore rules deployed  
✅ Extension built from latest code  

---

## Step-by-Step Testing Guide

### 1. Reload the Extension

```bash
# In Chrome:
1. Open chrome://extensions/
2. Find "Verse" extension
3. Click "Reload" button (🔄)
4. Verify no errors in console
```

**Or load from dist:**
1. Chrome → Extensions → Developer Mode → ON
2. Click "Load unpacked"
3. Select: `/Users/shreyasgurav/Desktop/Verse/dist/`

---

### 2. Sign In with Google

1. **Open side panel** (click extension icon or use keyboard shortcut)
2. **Click "Sign in with Google"** button
3. **Authenticate** in the popup window
4. **Side panel opens automatically** after sign-in

**Expected behavior:**
- Auth website redirects back to extension
- Side panel opens
- User sees chat interface

---

### 3. Verify Credit Display

**Look at the side panel header (top-left):**

Should see: **💳 $0.50 / $0.50**

If you see "Loading credits..." - wait 2-3 seconds for it to load.

---

### 4. Check Firestore Console

1. Go to: https://console.firebase.google.com/project/versebrowser/firestore/data
2. Navigate to: **userCredits** collection
3. Find your document: **{your-userId}**

**Expected data:**
```json
{
  "totalCreditsUSD": 0.50,
  "usedCreditsUSD": 0,
  "remainingCreditsUSD": 0.50,
  "createdAt": "2024-11-11T19:00:00.000Z",
  "lastUpdated": "2024-11-11T19:00:00.000Z"
}
```

**Screenshot of Firestore Console:**
```
Collection: userCredits
├── {your-userId}
│   ├── totalCreditsUSD: 0.5
│   ├── usedCreditsUSD: 0
│   ├── remainingCreditsUSD: 0.5
│   ├── createdAt: Timestamp
│   └── lastUpdated: Timestamp
```

---

### 5. Make an API Call

**Test credit deduction:**

1. In side panel, type: **"What is this page about?"**
2. Press Enter
3. Wait for response (should use gpt-4o-mini)
4. Watch the credit display update

**Expected behavior:**
- Credits decrease: **💳 $0.49 / $0.50** (approximate)
- Updates happen instantly (2-3 seconds max)

---

### 6. Verify Credits Updated in Firestore

1. **Refresh Firestore Console** (F5)
2. Go to: **userCredits** → **{your-userId}**
3. Check updated values:

```json
{
  "totalCreditsUSD": 0.50,
  "usedCreditsUSD": 0.0015,  // Example: ~1500 tokens cost
  "remainingCreditsUSD": 0.4985,
  "lastUpdated": "2024-11-11T19:05:00.000Z"  // Updated timestamp
}
```

---

### 7. Test Multiple API Calls

**Make 3-5 more API calls:**

1. "Summarize this page"
2. "Find the main heading"
3. "What's the title?"

**Expected behavior:**
- Credit display updates after each call
- Credits decrease gradually: $0.49 → $0.48 → $0.47...
- Firestore updates with each call
- No errors in console

---

### 8. Check Background Script Logs

**Open background script console:**

1. Chrome → Extensions → Verse → "service worker" link
2. Look for logs:

```
[Firebase] Initialized on extension load
[background] Auth data stored: { userId: "...", email: "...", name: "..." }
[Credits] Initializing credits for user: userId123
[Credits] Credits initialized: { total: 0.5, remaining: 0.5 }

[CreditTracker] Tracking usage: { userId: "...", modelName: "gpt-4o-mini", inputTokens: 150, outputTokens: 50, cost: "0.000015" }
[CreditTracker] Updated credits in Firestore: { userId: "...", used: "0.0015", remaining: "0.4985", total: "0.50" }
```

---

### 9. Test Credit Exhaustion

**To test $0 credits (optional):**

You can manually update Firestore:
1. Go to Firestore Console
2. Edit your document
3. Set: `remainingCreditsUSD: 0`
4. Try making another API call

**Expected behavior:**
- Error message: "You have used all your free credits ($0.50). Please configure your own API keys in Settings to continue using Verse."
- API call blocked
- No request sent to OpenAI

---

### 10. Test Credit Display States

**Different states to verify:**

| State | Display |
|-------|---------|
| Loading | "Loading credits..." |
| Credits available | "💳 $0.50 / $0.50" |
| Credits used | "💳 $0.35 / $0.50" |
| Credits low | "💳 $0.05 / $0.50" |
| Credits exhausted | "💳 $0.00 / $0.50" |

---

## Troubleshooting

### Credits not showing
**Check:**
1. Are you signed in? (check `isAuthenticated` state)
2. Background script console for errors
3. Firestore Console - does document exist?
4. Chrome storage: `chrome.storage.local.get(['user_credits_yourUserId'])`

**Fix:**
- Sign out and sign in again
- Reload extension
- Check Firebase rules are deployed

---

### Credits not updating
**Check:**
1. Firestore Console for updates
2. Background script logs for tracking calls
3. Network tab for Firestore API calls
4. Chrome storage change events

**Fix:**
- Wait 2-3 seconds (polling interval)
- Check internet connection
- Verify Firebase initialized correctly

---

### "Permission denied" errors
**Check:**
1. Firestore rules deployed: `firebase deploy --only firestore:rules`
2. User is authenticated
3. Firebase project ID matches

**Fix:**
```bash
cd /Users/shreyasgurav/Desktop/Verse
firebase deploy --only firestore:rules
```

---

### Firestore not initializing
**Check:**
1. Background script console for Firebase errors
2. Firebase config in `chrome-extension/src/background/services/firebase.ts`
3. Internet connection

**Fix:**
- Reload extension
- Check Firebase project status
- Verify API keys are correct

---

## Success Checklist

- [ ] Sign in successful
- [ ] Credits display shows: **💳 $0.50 / $0.50**
- [ ] Firestore document created: `/userCredits/{userId}`
- [ ] Document has correct fields (total, used, remaining)
- [ ] API call works
- [ ] Credits deducted after API call
- [ ] Credit display updates (💳 $0.49 / $0.50)
- [ ] Firestore document updated with new values
- [ ] Background logs show credit tracking
- [ ] Multiple API calls work
- [ ] Credits continue to decrease
- [ ] No console errors

---

## Expected Costs

**Example usage:**

| Task | Model | Tokens (in/out) | Cost |
|------|-------|----------------|------|
| "What is this page about?" | gpt-4o-mini | 200/50 | $0.0006 |
| "Summarize this page" | gpt-4o-mini | 500/100 | $0.0015 |
| "Find main heading" | gpt-4o-mini | 150/20 | $0.0004 |

**With $0.50 credits:**
- ~300-500 API calls possible
- Depending on task complexity
- Average cost: $0.001-$0.002 per call

---

## Quick Debug Commands

**Check credits in console:**
```javascript
// Background script console
const credits = await chrome.storage.local.get(['user_credits_yourUserId']);
console.log(credits);
```

**Check Firestore directly:**
```javascript
// Background script console
import { getUserCredits } from './services/creditTracker';
const credits = await getUserCredits('yourUserId');
console.log(credits);
```

**Reset credits (admin):**
```javascript
// Background script console
import { resetUserCredits } from './services/firestoreCredits';
await resetUserCredits('yourUserId', 0.50);
```

---

## Firebase Console Links

- **Project Overview**: https://console.firebase.google.com/project/versebrowser
- **Firestore Database**: https://console.firebase.google.com/project/versebrowser/firestore/data
- **Firestore Rules**: https://console.firebase.google.com/project/versebrowser/firestore/rules
- **Authentication**: https://console.firebase.google.com/project/versebrowser/authentication

---

## Next Steps After Testing

1. ✅ Verify all tests pass
2. ✅ Check Firestore security rules working
3. ✅ Monitor for any errors
4. 📊 Set up Firebase monitoring alerts
5. 📈 Track total credit usage across all users
6. 🔧 Add credit purchase flow (future enhancement)

---

**🎉 If all tests pass, your Firestore credit tracking system is working perfectly!**

