# Memory Retrieval Debug Guide

## Problem: Manually Added Memories Not Being Retrieved

### Root Cause
Manually added memories were missing **subcategories**, which are critical for the keyword matching strategy used in form filling.

### The Fix

**Before:**
```typescript
// Manual memory saved as:
{
  content: "I study at MIT",
  category: "fact",
  subcategory: undefined  // ❌ MISSING!
}

// Form field "College" → keyword "school" → NO MATCH
```

**After:**
```typescript
// Manual memory now saved as:
{
  content: "I study at MIT",
  category: "fact",
  subcategory: "school"  // ✅ DETECTED!
}

// Form field "College" → keyword "school" → MATCH! (score: 0.95)
```

## How Manual Memory Detection Works Now

### Strategy 1: Use Extraction Logic (Preferred)
When you manually add a memory, it first runs through `extractMemoriesFromPrompt()`:

```typescript
Input: "I study at MIT"
↓
extractMemoriesFromPrompt() detects pattern: /i\s+study\s+at/i
↓
Extracts structured memory:
{
  content: "User studies at MIT",
  category: "fact",
  subcategory: "school"
}
```

### Strategy 2: Keyword Detection (Fallback)
If extraction doesn't find anything, it uses keyword detection:

```typescript
const lowerText = text.toLowerCase();

if (lowerText.includes('college') || 
    lowerText.includes('university') || 
    lowerText.includes('school') || 
    lowerText.includes('study')) {
  subcategory = 'school';
  category = 'fact';
}
```

**Detected Subcategories:**
- `name` - Contains "name", "my name is", "i am [Name]"
- `email` - Contains "@" or "email"
- `phone` - Contains "phone", "mobile", "cell"
- `school` - Contains "college", "university", "school", "study"
- `company` - Contains "work", "company", "employer"
- `location` - Contains "live", "city", "location"

## Testing Steps

### 1. Clear Old Memories (Without Subcategories)

```javascript
// In browser console:
chrome.storage.local.get(['verse_memories'], (res) => {
  console.log('Current memories:', res.verse_memories);
  
  // Check which ones are missing subcategories
  const missing = res.verse_memories?.filter(m => !m.subcategory);
  console.log('Memories without subcategories:', missing);
});

// Optional: Clear all and start fresh
chrome.storage.local.set({ verse_memories: [] });
```

### 2. Add Manual Memory with Subcategory Detection

**Test 1: College**
```
1. Click + button in Memories
2. Type: "I study at Stanford University"
3. Click Save
4. Check console for:
   "Manual memory: Extracted 1 structured memories"
   OR
   "Manual memory: Saved with category=fact, subcategory=school"
```

**Test 2: Name**
```
1. Click + button
2. Type: "My name is Shreyas"
3. Click Save
4. Check console for:
   "Manual memory: Saved with category=personal_info, subcategory=name"
```

**Test 3: Email**
```
1. Click + button
2. Type: "shreyas@example.com"
3. Click Save
4. Check console for:
   "Manual memory: Saved with category=personal_info, subcategory=email"
```

### 3. Verify Subcategories in Storage

```javascript
chrome.storage.local.get(['verse_memories'], (res) => {
  console.log('=== Memory Structure Check ===');
  res.verse_memories?.forEach((m, i) => {
    console.log(`${i + 1}. [${m.subcategory || 'NO SUBCATEGORY'}] ${m.content.substring(0, 60)}`);
  });
});

// Expected output:
// 1. [school] I study at Stanford University
// 2. [name] My name is Shreyas
// 3. [email] shreyas@example.com
```

### 4. Test Form Filling

**Open a Google Form with fields:**
- "College/University"
- "Your Name"
- "Email Address"

**Click "Fill this Form"**

**Check Console Output:**
```
[google-forms] Searching memories for question: College/University
[MemoryRetrieval] Query: "College/University"
[MemoryRetrieval] Extracted keywords: school
[MemoryRetrieval] ⭐ Subcategory match added: I study at Stanford University (school)
[MemoryRetrieval] Returning top 1 memories:
  1. [0.950] I study at Stanford University
```

## Common Issues & Solutions

### Issue 1: "No subcategory detected"
**Symptom:** Console shows `subcategory=none`

**Cause:** Text doesn't match any keyword patterns

**Solution:** Make your manual memory more explicit:
- ❌ "Stanford" → No subcategory
- ✅ "I study at Stanford" → Subcategory: school
- ✅ "My college is Stanford" → Subcategory: school

### Issue 2: "Extraction skipped, no important info"
**Symptom:** Memory not saved at all

**Cause:** Text is too short or matches skip patterns

**Solution:** Add more context:
- ❌ "MIT" (too short)
- ✅ "I study at MIT"

### Issue 3: "Form not filling despite memory"
**Symptom:** Memory exists but form field empty

**Debug Steps:**
1. Check if memory has subcategory:
   ```javascript
   chrome.storage.local.get(['verse_memories'], (res) => {
     const college = res.verse_memories?.find(m => m.subcategory === 'school');
     console.log('College memory:', college);
   });
   ```

2. Check if keyword extraction works:
   ```javascript
   // In background console (inspect background page):
   const query = "College/University";
   const keywords = extractKeywords(query); // Should include "school"
   console.log('Extracted keywords:', keywords);
   ```

3. Check retrieval logs:
   - Look for `[MemoryRetrieval]` logs
   - Should see "Extracted keywords: school"
   - Should see "⭐ Subcategory match added"

### Issue 4: "Old memories without subcategories"
**Symptom:** Memories saved before the fix don't work

**Solution:** Re-add them manually or via chat:
1. Delete old memory
2. Re-type in chat: "My name is Shreyas"
3. OR use + button: "My name is Shreyas"
4. New memory will have subcategory

## Verification Commands

### Check Memory Structure
```javascript
chrome.storage.local.get(['verse_memories'], (res) => {
  const memories = res.verse_memories || [];
  console.log('Total memories:', memories.length);
  
  const bySubcategory = {};
  memories.forEach(m => {
    const sub = m.subcategory || 'none';
    bySubcategory[sub] = (bySubcategory[sub] || 0) + 1;
  });
  
  console.log('Memories by subcategory:', bySubcategory);
  // Expected: { name: 1, school: 1, email: 1, ... }
});
```

### Check Embeddings
```javascript
chrome.storage.local.get(['verse_memories'], (res) => {
  const withEmbeddings = res.verse_memories?.filter(m => m.embedding?.length > 0);
  const withoutEmbeddings = res.verse_memories?.filter(m => !m.embedding || m.embedding.length === 0);
  
  console.log('With embeddings:', withEmbeddings?.length);
  console.log('Without embeddings:', withoutEmbeddings?.length);
  
  if (withoutEmbeddings?.length > 0) {
    console.warn('⚠️ Some memories missing embeddings!');
    console.log('Missing:', withoutEmbeddings);
  }
});
```

### Test Keyword Extraction
```javascript
// Test what keywords are extracted from form field labels
const testQueries = [
  "Your Name",
  "College/University",
  "Email Address",
  "Phone Number",
  "Company Name",
  "City"
];

testQueries.forEach(query => {
  // This is pseudo-code - actual function is in background script
  console.log(`"${query}" → keywords:`, /* extractKeywords(query) */);
});

// Expected output:
// "Your Name" → keywords: ["name"]
// "College/University" → keywords: ["school"]
// "Email Address" → keywords: ["email"]
// "Phone Number" → keywords: ["phone"]
// "Company Name" → keywords: ["company"]
// "City" → keywords: ["location"]
```

## Best Practices for Manual Memories

### ✅ Good Examples
```
"My name is Shreyas Gurav"
"I study at Stanford University"
"My email is shreyas@example.com"
"My phone number is 555-1234"
"I work at Google"
"I live in Mumbai"
```

### ❌ Bad Examples (Won't Detect Subcategory)
```
"Shreyas" (too short, no context)
"Stanford" (no context)
"shreyas@example.com" (will work - has @)
"555-1234" (no "phone" keyword)
"Google" (no "work" keyword)
"Mumbai" (no "live" keyword)
```

### 💡 Pro Tips
1. **Use full sentences** - "I study at MIT" vs "MIT"
2. **Include keywords** - "My college is X" vs just "X"
3. **Be explicit** - "My phone is X" vs just the number
4. **Check console** - Look for subcategory confirmation
5. **Test immediately** - Fill a form right after adding memory

## Summary

### What Changed
1. ✅ Manual memories now run through extraction logic
2. ✅ Fallback keyword detection for subcategories
3. ✅ Console logging shows detected subcategory
4. ✅ Subcategories enable 0.95 score matching (vs 0.3-0.6 semantic)

### How to Use
1. Click + in Memories panel
2. Type memory with context (e.g., "I study at MIT")
3. Check console for subcategory detection
4. Test form filling immediately
5. If not working, check debug steps above

### Key Insight
**Subcategories are the secret sauce!** They enable instant keyword matching (0.95 score) instead of relying solely on semantic similarity (0.3-0.6 score).

```
Form field "College" → keyword "school" → subcategory "school" → INSTANT MATCH! ✅
```

Rebuild and test! Your manually added memories should now work perfectly for form filling. 🎯✨
