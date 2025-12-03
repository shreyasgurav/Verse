# Memory Form Filling Debug Guide

## Your Specific Issue: "My name is Shreyas" not filling Google Form

### Step-by-Step Debugging

#### 1. Check if Memory Was Saved

Open browser console and run:
```javascript
chrome.storage.local.get(['verse_memories'], (res) => {
  const memories = res.verse_memories || [];
  console.log('Total memories:', memories.length);
  memories.forEach((m, i) => {
    console.log(`${i + 1}. [${m.category}] ${m.content}`);
    console.log(`   Has embedding: ${m.embedding ? 'Yes (' + m.embedding.length + ' dims)' : 'No'}`);
  });
});
```

**Expected Output:**
```
Total memories: 1
1. [fact] My name is Shreyas
   Has embedding: Yes (1536 dims)
```

**If you see "Has embedding: No":**
- OpenAI API key not configured
- System fell back to TF-IDF (less accurate)
- Solution: Configure OpenAI provider in settings

#### 2. Test Memory Extraction

In Verse side panel, send this exact message:
```
My name is Shreyas
```

Check console for:
```
Memory extraction: Found 1 important memories
Memory added: fact - My name is Shreyas
✅ Memory save complete: 1 added, 0 updated, embeddings generated
```

**If you see "No important information to save":**
- Pattern not matching
- Try: "my name is Shreyas" (lowercase)
- Or: "I am Shreyas"

#### 3. Check Form Field Label

When you click "Fill this Form" on Google Forms, check console for:
```
[google-forms] Searching memories for question: Your name
[MemoryRetrieval] Query: "Your name"
[MemoryRetrieval] Total memories: 1
```

**Common Google Forms name field labels:**
- "Your name"
- "Name"
- "Full name"
- "First name"
- "What is your name?"

#### 4. Check Memory Retrieval

Look for these logs:
```
[MemoryRetrieval] Similarity 0.456: My name is Shreyas
[MemoryRetrieval] Found 1 memories above threshold 0.3
[google-forms] ✅ Found 1 relevant memories for question: Your name
  1. [0.456] My name is Shreyas
```

**If similarity is below 0.3:**
- Embeddings might not be working
- Try with OpenAI API key
- Or try more explicit memory: "My name for forms is Shreyas"

#### 5. Check AI Response

Look for:
```
[google-forms] Question: Your name Answer: Shreyas
```

**If answer is wrong:**
- Memory context not being used
- AI not extracting name correctly
- Try structured memory: "Name: Shreyas"

### Quick Fixes

#### Fix 1: Use More Explicit Memory Format

Instead of: `"My name is Shreyas"`

Try these formats:
```
Name: Shreyas
Full name: Shreyas Gurav
For forms, my name is Shreyas
When asked for my name, use Shreyas
```

#### Fix 2: Save Multiple Variations

Send all of these:
```
My name is Shreyas
I am Shreyas
My full name is Shreyas Gurav
Call me Shreyas
```

This creates multiple memories that match different question formats.

#### Fix 3: Test with Exact Match

1. Note the exact form field label (e.g., "Your name")
2. Save memory with that exact wording: "Your name is Shreyas"
3. This should give very high similarity

#### Fix 4: Lower Threshold Further

If still not working, edit:
`chrome-extension/src/background/services/memoryRetrieval.ts`

Change line 109:
```typescript
minSimilarity = 0.3, // Try 0.2 or even 0.1
```

### Console Commands for Testing

#### Test Semantic Similarity
```javascript
// Simulate what the system does
const query = "Your name";
const memory = "My name is Shreyas";

// Simple word overlap test
const queryWords = query.toLowerCase().split(' ');
const memoryWords = memory.toLowerCase().split(' ');
const overlap = queryWords.filter(w => memoryWords.includes(w)).length;
console.log('Word overlap:', overlap, '/', queryWords.length);
// Should show: Word overlap: 1 / 2 (50% - "name" matches)
```

#### Force Rebuild Embeddings
```javascript
// Clear and rebuild
chrome.storage.local.get(['verse_memories'], async (res) => {
  const memories = res.verse_memories || [];
  console.log('Rebuilding embeddings for', memories.length, 'memories');
  // Memories will be rebuilt next time you send a message
});
```

#### Check OpenAI API Key
```javascript
chrome.storage.local.get(['llmProviders'], (res) => {
  const providers = res.llmProviders || {};
  const openai = Object.values(providers).find(p => p.type === 'openai');
  console.log('OpenAI configured:', !!openai);
  console.log('Has API key:', !!openai?.apiKey);
});
```

### Expected Full Console Output

When everything works correctly:

```
// 1. Memory saved
Memory extraction: Found 1 important memories
Memory added: fact - My name is Shreyas
🔑 Using OpenAI API key from providers for embeddings
✅ Memory save complete: 1 added, 0 updated, embeddings generated

// 2. Form filling started
[google-forms] Searching memories for question: Your name

// 3. Memory retrieval
[MemoryRetrieval] Query: "Your name"
[MemoryRetrieval] Total memories: 1
[MemoryRetrieval] Similarity 0.456: My name is Shreyas
[MemoryRetrieval] Checked 1 memories with embeddings
[MemoryRetrieval] Found 1 memories above threshold 0.3
[MemoryRetrieval] Returning top 1 memories:
  1. [0.456] My name is Shreyas

// 4. AI response
[google-forms] ✅ Found 1 relevant memories for question: Your name
  1. [0.456] My name is Shreyas
[google-forms] Question: Your name Answer: Shreyas
```

### Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| "No memories found in storage" | Memory not saved | Send message with "My name is Shreyas" |
| "Skipping memory without embedding" | No OpenAI key | Configure OpenAI provider |
| "Similarity 0.123" (too low) | Poor semantic match | Use more explicit memory format |
| "No relevant memories found" | All below threshold | Lower threshold to 0.2 or 0.1 |
| Form not filling | Answer not applied | Check form field type/selector |

### Recommended Memory Formats for Forms

**For Name:**
```
My name is Shreyas
My full name is Shreyas Gurav
First name: Shreyas
Last name: Gurav
```

**For Email:**
```
My email is shreyas@example.com
Email address: shreyas@example.com
Contact email: shreyas@example.com
```

**For Phone:**
```
My phone number is +91-1234567890
Phone: +91-1234567890
Mobile: +91-1234567890
```

**For Address:**
```
I live in Mumbai, India
My city is Mumbai
Address: Mumbai, India
```

### Testing Checklist

- [ ] Memory saved with "My name is Shreyas"
- [ ] Memory has embedding (check console)
- [ ] OpenAI API key configured
- [ ] Form field label extracted correctly
- [ ] Similarity score above 0.3
- [ ] AI receives memory context
- [ ] AI extracts "Shreyas" from memory
- [ ] Form field filled with "Shreyas"

### If Still Not Working

1. **Enable debug mode:**
   ```javascript
   localStorage.setItem('verseFormDebug', '1');
   ```

2. **Check all console logs** - copy and share them

3. **Try manual test:**
   - Save memory: "For the name field, use Shreyas"
   - This should match "name" keyword directly

4. **Verify form field:**
   - Right-click form field → Inspect
   - Check if it's a standard input field
   - Some forms use custom components

### Success Criteria

✅ Memory saved with embedding  
✅ Similarity score > 0.3  
✅ Memory context injected into AI prompt  
✅ AI responds with "Shreyas"  
✅ Form field filled automatically  

If all above pass but form still not filling, the issue is with form field application, not memory retrieval.
