# Credit System Implementation Plan

## Overview
Implement a $0.50 credit limit for authenticated users using your API keys. Track usage per user and require users to add their own keys when credits are exhausted.

## Architecture

### 1. Backend - Firestore Database
**Collection:** `userCredits`
**Schema:**
```typescript
{
  userId: string;          // Firebase user ID
  totalCredits: number;    // $0.50
  usedCredits: number;     // Accumulated usage in USD
  remainingCredits: number; // totalCredits - usedCredits
  lastUpdated: timestamp;
  createdAt: timestamp;
}
```

### 2. Token Tracking - LangChain Callbacks
**Current LLM call flow:**
```
setupExecutor() → createChatModel() → BaseAgent.invoke() → chatLLM.invoke()
```

**Add callback handler to track usage:**
```typescript
import { BaseCallbackHandler } from '@langchain/core/callbacks/base';

class TokenUsageCallbackHandler extends BaseCallbackHandler {
  name = "token_usage_tracker";
  private userId: string;
  private totalTokens = 0;
  private modelName: string;
  
  async handleLLMEnd(output) {
    // Extract token usage from response
    const usage = output.llmOutput?.tokenUsage;
    if (usage) {
      const cost = calculateCost(
        usage.promptTokens,
        usage.completionTokens,
        this.modelName
      );
      
      // Update Firestore
      await updateUserCredits(this.userId, cost);
    }
  }
}
```

### 3. Model Pricing (as of current rates)
**GPT-4o-mini (primary model used):**
- Input: $0.150 / 1M tokens = $0.00000015 per token
- Output: $0.600 / 1M tokens = $0.0000006 per token

**Cost calculation:**
```typescript
function calculateCost(
  promptTokens: number,
  completionTokens: number,
  modelName: string
): number {
  const pricing = {
    'gpt-4o-mini': {
      input: 0.00000015,
      output: 0.0000006
    },
    'gpt-4o': {
      input: 0.0000025,
      output: 0.00001
    },
    // Add other models as needed
  };
  
  const rates = pricing[modelName] || pricing['gpt-4o-mini'];
  return (promptTokens * rates.input) + (completionTokens * rates.output);
}
```

### 4. Credit Checking Flow

**Before task execution:**
```typescript
async function setupExecutor(taskId, task, browserContext, tabId) {
  const authResult = await chrome.storage.local.get(['userId', 'isAuthenticated']);
  const isUserAuthenticated = authResult.isAuthenticated === true && authResult.userId;
  
  let providers = await llmProviderStore.getAllProviders();
  
  // If user is authenticated and no providers configured
  if (isUserAuthenticated && Object.keys(providers).length === 0) {
    // Check if user has remaining credits
    const creditCheck = await checkUserCredits(authResult.userId);
    
    if (!creditCheck.hasCredits) {
      throw new Error(
        `You've used all $${creditCheck.totalCredits} of free credits. ` +
        `Please add your own API keys in Settings to continue.`
      );
    }
    
    logger.info('[background] Using default API keys, remaining credits:', 
                creditCheck.remainingCredits);
    
    // Initialize token tracking callback
    const tokenCallback = new TokenUsageCallbackHandler(authResult.userId, 'gpt-4o-mini');
    
    // Create default provider with callback
    const defaultProvider = {
      name: 'OpenAI (Default)',
      type: 'openai',
      apiKey: import.meta.env.VITE_DEFAULT_OPENAI_API_KEY,
      modelNames: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo'],
      createdAt: Date.now(),
      callbacks: [tokenCallback], // Add callback
    };
    
    providers = { 'openai-default': defaultProvider };
    
    // ... rest of setup
  }
}
```

## Implementation Steps

### Step 1: Set up Firestore
```bash
# Install Firestore dependencies
cd chrome-extension
npm install firebase
```

**Create Firestore service:**
```typescript
// chrome-extension/src/background/services/credits.ts
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, updateDoc, increment } from 'firebase/firestore';

const firebaseConfig = {
  // Use same config as auth-website
  apiKey: 'AIzaSyBgykR-cdNenZbMyCTbaDlbl-_HiC58Pc0',
  authDomain: 'versebrowser.firebaseapp.com',
  projectId: 'versebrowser',
  // ... other config
};

const app = initializeApp(firebaseConfig, 'credits-app');
const db = getFirestore(app);

export async function initializeUserCredits(userId: string) {
  const userRef = doc(db, 'userCredits', userId);
  const userDoc = await getDoc(userRef);
  
  if (!userDoc.exists()) {
    await setDoc(userRef, {
      userId,
      totalCredits: 0.50,
      usedCredits: 0.00,
      remainingCredits: 0.50,
      lastUpdated: Date.now(),
      createdAt: Date.now(),
    });
  }
}

export async function getUserCredits(userId: string) {
  const userRef = doc(db, 'userCredits', userId);
  const userDoc = await getDoc(userRef);
  
  if (!userDoc.exists()) {
    await initializeUserCredits(userId);
    return { remainingCredits: 0.50, usedCredits: 0.00, totalCredits: 0.50 };
  }
  
  return userDoc.data();
}

export async function updateUserCredits(userId: string, cost: number) {
  const userRef = doc(db, 'userCredits', userId);
  
  await updateDoc(userRef, {
    usedCredits: increment(cost),
    remainingCredits: increment(-cost),
    lastUpdated: Date.now(),
  });
  
  // Send update to side panel
  chrome.runtime.sendMessage({
    type: 'CREDITS_UPDATED',
    data: await getUserCredits(userId),
  });
}

export async function checkUserCredits(userId: string) {
  const credits = await getUserCredits(userId);
  return {
    hasCredits: credits.remainingCredits > 0,
    remainingCredits: credits.remainingCredits,
    totalCredits: credits.totalCredits,
    usedCredits: credits.usedCredits,
  };
}
```

### Step 2: Create Token Tracking Callback
```typescript
// chrome-extension/src/background/callbacks/tokenUsage.ts
import { BaseCallbackHandler } from '@langchain/core/callbacks/base';
import { updateUserCredits } from '../services/credits';

export class TokenUsageCallbackHandler extends BaseCallbackHandler {
  name = "token_usage_tracker";
  
  constructor(
    private userId: string,
    private modelName: string
  ) {
    super();
  }
  
  async handleLLMEnd(output: any) {
    try {
      const usage = output?.llmOutput?.tokenUsage;
      if (!usage) {
        console.warn('[TokenCallback] No token usage in response');
        return;
      }
      
      const cost = this.calculateCost(
        usage.promptTokens || 0,
        usage.completionTokens || 0
      );
      
      console.log('[TokenCallback] Cost:', cost, 'Tokens:', usage);
      
      if (cost > 0) {
        await updateUserCredits(this.userId, cost);
      }
    } catch (error) {
      console.error('[TokenCallback] Error tracking usage:', error);
    }
  }
  
  private calculateCost(promptTokens: number, completionTokens: number): number {
    const pricing = {
      'gpt-4o-mini': { input: 0.00000015, output: 0.0000006 },
      'gpt-4o': { input: 0.0000025, output: 0.00001 },
      'gpt-4-turbo': { input: 0.00001, output: 0.00003 },
    };
    
    const rates = pricing[this.modelName] || pricing['gpt-4o-mini'];
    const cost = (promptTokens * rates.input) + (completionTokens * rates.output);
    
    // Round to 6 decimal places
    return Math.round(cost * 1000000) / 1000000;
  }
}
```

### Step 3: Update setupExecutor() and summarizePage()
**In `chrome-extension/src/background/index.ts`:**
```typescript
import { checkUserCredits, initializeUserCredits } from './services/credits';
import { TokenUsageCallbackHandler } from './callbacks/tokenUsage';

async function setupExecutor(taskId, task, browserContext, tabId) {
  const authResult = await chrome.storage.local.get(['userId', 'isAuthenticated']);
  const isUserAuthenticated = authResult.isAuthenticated === true && authResult.userId;
  
  let providers = await llmProviderStore.getAllProviders();
  let agentModels = await agentModelStore.getAllAgentModels();
  
  if (isUserAuthenticated && Object.keys(providers).length === 0) {
    // Initialize user credits if first time
    await initializeUserCredits(authResult.userId);
    
    // Check if user has remaining credits
    const creditCheck = await checkUserCredits(authResult.userId);
    
    if (!creditCheck.hasCredits) {
      throw new Error(
        `You've used all $${creditCheck.totalCredits.toFixed(2)} of free credits. ` +
        `Please add your own API keys in Settings to continue using Verse.`
      );
    }
    
    logger.info('[background] Using default API keys, remaining:', 
                `$${creditCheck.remainingCredits.toFixed(4)}`);
    
    // Create token tracking callback
    const tokenCallback = new TokenUsageCallbackHandler(authResult.userId, 'gpt-4o-mini');
    
    // Create default provider
    const defaultProvider = {
      name: 'OpenAI (Default)',
      type: 'openai',
      apiKey: import.meta.env.VITE_DEFAULT_OPENAI_API_KEY,
      modelNames: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo'],
      createdAt: Date.now(),
    };
    
    providers = { 'openai-default': defaultProvider };
    
    agentModels = {
      [AgentNameEnum.Navigator]: {
        provider: 'openai-default',
        modelName: 'gpt-4o-mini',
        parameters: { temperature: 0.1, maxTokens: 4096 },
        callbacks: [tokenCallback], // Add callback here
      },
      [AgentNameEnum.Planner]: {
        provider: 'openai-default',
        modelName: 'gpt-4o-mini',
        parameters: { temperature: 0.1, maxTokens: 4096 },
        callbacks: [tokenCallback], // Add callback here
      },
    };
  }
  
  // ... rest of setup
}
```

### Step 4: Update Side Panel UI
**In `pages/side-panel/src/SidePanel.tsx`:**
```typescript
const [userCredits, setUserCredits] = useState<{
  remaining: number;
  total: number;
} | null>(null);

useEffect(() => {
  // Load credits on mount
  const loadCredits = async () => {
    if (userAuth?.userId) {
      // Request credits from background
      chrome.runtime.sendMessage({ type: 'GET_USER_CREDITS' }, (response) => {
        if (response?.credits) {
          setUserCredits({
            remaining: response.credits.remainingCredits,
            total: response.credits.totalCredits,
          });
        }
      });
    }
  };
  
  loadCredits();
  
  // Listen for credit updates
  const handleMessage = (message: any) => {
    if (message.type === 'CREDITS_UPDATED') {
      setUserCredits({
        remaining: message.data.remainingCredits,
        total: message.data.totalCredits,
      });
    }
  };
  
  chrome.runtime.onMessage.addListener(handleMessage);
  return () => chrome.runtime.onMessage.removeListener(handleMessage);
}, [userAuth]);

// In header render:
<header className="header relative">
  <div className="header-logo">
    {/* ... existing logo ... */}
  </div>
  
  {/* Credits display - only show if using default keys */}
  {userAuth && userCredits && (
    <div className="credits-display">
      <span className="credits-amount">
        ${userCredits.remaining.toFixed(4)}
      </span>
      <span className="credits-label">credits</span>
    </div>
  )}
  
  <div className="header-icons">
    {/* ... existing icons ... */}
  </div>
</header>
```

**Add CSS for credits display:**
```css
.credits-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 4px 12px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  margin: 0 auto;
}

.credits-amount {
  font-size: 14px;
  font-weight: 600;
  color: #fff;
}

.credits-label {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.7);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Warning state when low */
.credits-display.low {
  background: rgba(255, 193, 7, 0.2);
}

.credits-display.low .credits-amount {
  color: #ffc107;
}
```

### Step 5: Add Background Message Handler
**In `chrome-extension/src/background/index.ts`:**
```typescript
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_USER_CREDITS') {
    (async () => {
      try {
        const authResult = await chrome.storage.local.get(['userId', 'isAuthenticated']);
        if (authResult.isAuthenticated && authResult.userId) {
          const credits = await getUserCredits(authResult.userId);
          sendResponse({ credits });
        } else {
          sendResponse({ credits: null });
        }
      } catch (error) {
        sendResponse({ error: error.message });
      }
    })();
    return true; // Keep channel open for async
  }
  
  // ... other message handlers
});
```

## Testing Approach

1. **Local testing:**
   - Sign in with test Google account
   - Run tasks and verify token tracking logs
   - Check Firestore console for credit updates

2. **Cost estimation:**
   - Average task uses ~2000-5000 tokens (input + output)
   - At $0.00000075 per token avg: ~$0.00375 per task
   - $0.50 = ~133 tasks

3. **Edge cases to handle:**
   - Concurrent API calls
   - Failed calls (don't charge)
   - Cancelled tasks (charge only for completed calls)
   - Network failures during credit update

## Alternative: Use OpenAI API Usage Tracking

**Simpler approach** - Use OpenAI's native usage API:
```typescript
// Query usage periodically from OpenAI
import OpenAI from 'openai';

async function getOpenAIUsage(apiKey: string, organizationId: string) {
  const response = await fetch(
    `https://api.openai.com/v1/usage?date=${todayDate}`,
    {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'OpenAI-Organization': organizationId,
      }
    }
  );
  
  const data = await response.json();
  // Returns total cost for the day
  return data.total_usage / 100; // Convert cents to dollars
}
```

**Limitations:**
- Can't track per-user (only per API key)
- Less real-time (need to poll)
- Can't differentiate between users

## Recommendation

**Use LangChain callbacks approach** because:
1. ✅ Per-user tracking
2. ✅ Real-time updates
3. ✅ Works with any LLM provider
4. ✅ More control over cost calculation
5. ✅ Can show usage in UI immediately

## Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /userCredits/{userId} {
      // Users can read their own credits
      allow read: if request.auth != null && request.auth.uid == userId;
      
      // Only server (via admin SDK) can write
      allow write: if false;
    }
  }
}
```

**Note:** All updates should go through your backend/extension, not directly from client.

## Next Steps

1. Add Firebase to extension manifest
2. Implement credits service
3. Add token tracking callback
4. Update setupExecutor and summarizePage
5. Update side panel UI
6. Test with real API calls
7. Deploy and monitor

