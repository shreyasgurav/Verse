# Memory System Testing Guide

## Quick Test Checklist

### 1. Test Memory Saving

**Steps:**
1. Open Verse side panel
2. Send a prompt with personal info: `"My name is John Smith and my email is john@example.com"`
3. Check console for:
   ```
   Memory extraction: Found 2 important memories
   Memory added: fact - My name is John Smith
   Memory added: fact - my email is john@example.com
   ✅ Memory save complete: 2 added, 0 updated, embeddings generated
   ```

**Expected:**
- Console shows memories extracted and saved
- Embeddings generated (if OpenAI key configured)

### 2. Test Memory Retrieval (Chat)

**Steps:**
1. After saving memories above, send: `"What's my email?"`
2. Check console for:
   ```
   🧠 Injected 1 relevant memories into prompt context
   ```
3. AI should respond with your email from memory

**Expected:**
- Console shows memory injection
- AI uses your saved email in response

### 3. Test Memory Retrieval (Forms)

**Steps:**
1. Save memory: `"My name is Alice Johnson"`
2. Open a form (any website with input fields)
3. Click "Fill this Form" button
4. Check console for:
   ```
   [universal-forms] Found 1 relevant memories for field: Name
   [universal-forms] Field: Name Type: text Answer: Alice Johnson
   ```

**Expected:**
- Console shows memory retrieval
- Form field filled with "Alice Johnson"

### 4. Test No Duplicate Saving

**Steps:**
1. Send: `"My name is John Smith"`
2. Send again: `"My name is John"`
3. Check console for:
   ```
   Memory updated: fact - My name is John
   ```

**Expected:**
- Second prompt updates existing memory, doesn't create duplicate

### 5. Test Memory View UI

**Steps:**
1. Click Clock icon (⏰) in header
2. Should see list of saved memories
3. Each memory shows:
   - Content only (no timestamp/category)
   - Trash icon to delete

**Expected:**
- Memories displayed in clean list
- Delete button works

## Console Logging Reference

### Memory Saving
```
✅ Good:
Memory extraction: Found 2 important memories
Memory added: preference - I prefer Python
🔑 Using OpenAI API key from providers for embeddings
✅ Memory save complete: 1 added, 0 updated, embeddings generated

❌ Bad:
Memory extraction: No important information to save - Simple action/query command
```

### Memory Retrieval (Chat)
```
✅ Good:
🧠 Injected 2 relevant memories into prompt context

ℹ️ Info:
🧠 No relevant memories found for this prompt
🧠 No memories saved yet
```

### Memory Retrieval (Forms)
```
✅ Good:
[google-forms] Found 2 relevant memories for question: What is your name?
[universal-forms] Found 1 relevant memories for field: Email Address

ℹ️ Info:
[google-forms] Found 0 relevant memories for question: Favorite color
```

## Common Issues & Fixes

### Issue: "No memories saved yet"
**Cause:** No memories in storage
**Fix:** Send prompts with personal info (name, email, preferences)

### Issue: "No relevant memories found"
**Cause:** Saved memories don't match current prompt
**Fix:** 
- Check similarity threshold (50% default)
- Save more relevant memories
- Use keywords that match saved memories

### Issue: "Memory extraction: No important information to save"
**Cause:** Prompt doesn't contain important info
**Fix:** This is expected for:
- Simple commands: "Click the button"
- Questions: "What is the weather?"
- Navigation: "Go to google.com"

### Issue: Embeddings not generated
**Cause:** No OpenAI API key configured
**Fix:**
- Configure OpenAI provider in settings
- System will fall back to TF-IDF (less accurate)

### Issue: Form not filling with saved info
**Cause:** Memory not matching field label
**Fix:**
- Check console for memory retrieval logs
- Ensure saved memory matches field context
- Example: Field "Email" needs memory "My email is..."

## Debug Mode

Enable detailed logging:
```javascript
// In browser console
localStorage.setItem('verseFormDebug', '1');
// Reload page
```

This shows:
- Form field detection
- Field context extraction
- Answer generation
- Fill success/failure

## Testing Scenarios

### Scenario 1: Personal Info
```
1. Save: "My name is Alice, email alice@example.com, phone 555-0123"
2. Open form with Name/Email/Phone fields
3. Click "Fill this Form"
4. Verify: All fields filled correctly
```

### Scenario 2: Preferences
```
1. Save: "I prefer Python for programming"
2. Chat: "Help me code"
3. Verify: AI suggests Python code
```

### Scenario 3: Professional Info
```
1. Save: "I work at Google as a Software Engineer with 5 years experience"
2. Open job application form
3. Click "Fill this Form"
4. Verify: Company, Title, Experience fields filled
```

## Expected Behavior Summary

| Action | Console Output | Result |
|--------|---------------|--------|
| Save important info | `Memory added: fact - ...` | Memory stored with embedding |
| Save duplicate | `Memory updated: fact - ...` | Existing memory updated |
| Save simple command | `No important information to save` | Nothing saved |
| Chat with relevant memory | `🧠 Injected X memories` | AI gets context |
| Chat without relevant memory | `🧠 No relevant memories found` | AI responds normally |
| Fill form with memory | `Found X relevant memories` | Form filled with your info |
| Fill form without memory | `Found 0 relevant memories` | AI generates generic answer |

## Troubleshooting Commands

```javascript
// Check saved memories
chrome.storage.local.get(['verse_memories'], (res) => {
  console.log('Total memories:', res.verse_memories?.length || 0);
  console.log('Memories:', res.verse_memories);
});

// Clear all memories (reset)
chrome.storage.local.set({ verse_memories: [] });

// Check if embeddings exist
chrome.storage.local.get(['verse_memories'], (res) => {
  const withEmbeddings = res.verse_memories?.filter(m => m.embedding?.length > 0).length || 0;
  console.log('Memories with embeddings:', withEmbeddings);
});
```

## Success Criteria

✅ **Memory Saving Works:**
- Important info extracted and saved
- Duplicates updated, not created
- Embeddings generated
- Console shows confirmation

✅ **Memory Retrieval Works (Chat):**
- Relevant memories found and injected
- AI uses context in responses
- Console shows injection count

✅ **Memory Retrieval Works (Forms):**
- Form fields filled with saved info
- Console shows memory retrieval
- Accurate field matching

✅ **UI Works:**
- Clock icon shows memories
- Clean list display
- Delete button works

## Next Steps After Testing

1. **If saving fails:** Check console errors, verify API key
2. **If retrieval fails:** Check similarity threshold, save more memories
3. **If forms don't fill:** Enable debug mode, check field context
4. **If embeddings missing:** Configure OpenAI provider

## Report Issues

When reporting issues, include:
1. Console logs (full output)
2. Steps to reproduce
3. Expected vs actual behavior
4. Browser version
5. Extension version
