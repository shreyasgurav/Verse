# Memory-Powered Form Filling

## Overview

Verse now uses your saved memories to intelligently fill out forms! When you click "Fill this Form", the system retrieves relevant memories based on each field's label/question and uses them to provide personalized, context-aware answers.

## How It Works

### 1. Memory Retrieval Process

```
Form Field: "What is your name?"
    ↓
Semantic Search in Memories
    ↓
Found: "My name is John" (fact, 92% similarity)
    ↓
Inject into AI Prompt
    ↓
AI Response: "John"
    ↓
Fill Field
```

### 2. Integration Points

**Google Forms** (`chrome-extension/src/background/features/google-forms/index.ts`):
- Retrieves top 3 relevant memories per question
- Injects memory context into prompt
- AI uses memories to answer multiple choice and text questions

**Universal Forms** (`chrome-extension/src/background/features/universal-forms/index.ts`):
- Retrieves top 3 relevant memories per field
- Injects memory context into prompt
- AI uses memories to fill any form field (name, email, phone, etc.)

### 3. Memory Matching

For each form field, the system:
1. Extracts the field label/question (e.g., "What is your email?")
2. Generates embedding for the question
3. Searches saved memories using cosine similarity
4. Retrieves top 3 most relevant memories (>50% similarity)
5. Formats memories as context for AI

## Example Scenarios

### Scenario 1: Personal Information

**Saved Memories:**
- "My name is John Smith"
- "My email is john@example.com"
- "I live in San Francisco"

**Form Fields:**
- "Full Name" → AI receives memory "My name is John Smith" → Fills "John Smith"
- "Email Address" → AI receives memory "My email is john@example.com" → Fills "john@example.com"
- "City" → AI receives memory "I live in San Francisco" → Fills "San Francisco"

### Scenario 2: Preferences

**Saved Memories:**
- "I prefer Python for programming"
- "I'm interested in machine learning"

**Form Fields:**
- "Preferred programming language?" → AI receives "I prefer Python" → Fills "Python"
- "Areas of interest?" → AI receives "I'm interested in machine learning" → Fills "Machine Learning"

### Scenario 3: Professional Information

**Saved Memories:**
- "I work at Google as a Software Engineer"
- "I have 5 years of experience in web development"

**Form Fields:**
- "Company" → AI receives "I work at Google" → Fills "Google"
- "Job Title" → AI receives "Software Engineer" → Fills "Software Engineer"
- "Years of Experience" → AI receives "5 years of experience" → Fills "5"

## Technical Implementation

### Files Created

**`chrome-extension/src/background/services/memoryRetrieval.ts`**
- Memory retrieval service for background scripts
- Cosine similarity calculation
- OpenAI embeddings + TF-IDF fallback
- Memory formatting for prompts

### Files Modified

**`chrome-extension/src/background/features/google-forms/index.ts`**
- Imports memory retrieval service
- Retrieves relevant memories for each question
- Injects memory context into AI prompt

**`chrome-extension/src/background/features/universal-forms/index.ts`**
- Imports memory retrieval service
- Retrieves relevant memories for each field
- Injects memory context into AI prompt

### Code Flow

```typescript
// 1. Retrieve memories
const relevantMemories = await retrieveRelevantMemories(
  question.question, // or field.context
  openAIKey,
  3, // Top 3
  0.5 // 50% min similarity
);

// 2. Format as context
const memoryContext = formatMemoriesForPrompt(relevantMemories);
// Output:
// [Relevant information from your saved memories:]
// ℹ️ My name is John Smith
// ⚙️ I prefer Python for programming
//

// 3. Inject into prompt
const prompt = `${memoryContext}You are filling out a form field. Use the information from your memories above if relevant.

Field Context: ${field.context}
...`;

// 4. AI generates answer using memory context
const response = await chatModel.invoke(prompt);
```

## Memory Context Format

When memories are found, they're formatted as:

```
[Relevant information from your saved memories:]
ℹ️ My name is John Smith
⚙️ I prefer using Python
🎯 I'm trying to learn machine learning

You are filling out a form field. Use the information from your memories above if relevant.

Field Context: What is your name?
...
```

**Category Emojis:**
- ⚙️ Preference
- ℹ️ Fact
- 🎯 Goal
- 💡 Skill
- 📝 Context

## Configuration

**Automatic:**
- Uses OpenAI API key from provider settings for embeddings
- Falls back to TF-IDF if no API key available
- No additional setup needed

**Parameters:**
- Top K memories: 3 (most relevant)
- Minimum similarity: 0.5 (50%)
- Embedding model: `text-embedding-3-small` (OpenAI)

## Console Output

### When Memories Found
```
[google-forms] Found 2 relevant memories for question: What is your name?
[google-forms] Question: What is your name? Answer: John Smith
```

### When No Memories Found
```
[universal-forms] Found 0 relevant memories for field: Favorite color
[universal-forms] Field: Favorite color Type: text Answer: Blue
```

## Benefits

1. **Personalized Answers**: Forms filled with your actual information
2. **Consistent Data**: Same information across all forms
3. **Time Saving**: No need to remember and type the same info repeatedly
4. **Privacy**: Memories stored locally in browser
5. **Smart Matching**: Semantic search finds relevant info even with different wording

## Example Use Cases

### Job Applications
- Saved: "I have 5 years of experience in React development"
- Form asks: "Years of frontend experience?"
- AI fills: "5"

### Contact Forms
- Saved: "My phone number is +1-555-0123"
- Form asks: "Contact number"
- AI fills: "+1-555-0123"

### Surveys
- Saved: "I prefer dark mode for coding"
- Form asks: "Preferred IDE theme?"
- AI fills: "Dark mode"

### Registration Forms
- Saved: "I'm interested in AI and machine learning"
- Form asks: "Areas of interest (select all that apply)"
- AI selects: "Artificial Intelligence", "Machine Learning"

## Limitations

1. **Memory Quality**: Depends on what you've saved
2. **Similarity Threshold**: May miss relevant memories if similarity < 50%
3. **Context Understanding**: AI interprets memories, may not always be perfect
4. **Storage Limit**: 200 memories max (chrome.storage.local)

## Privacy & Security

- **Local Storage**: Memories stored in browser, not sent to servers
- **Sensitive Fields**: Password fields are automatically skipped
- **User Control**: You can view and delete memories anytime
- **Opt-in**: Form filling only happens when you click the button

## Testing

### Test Scenario

1. **Save memories**:
   - "My name is Alice Johnson"
   - "My email is alice@example.com"
   - "I prefer Python programming"

2. **Open a form** (Google Form or any website form)

3. **Click "Fill this Form"** button

4. **Watch console** for memory retrieval logs

5. **Verify** fields are filled with your saved information

### Expected Behavior

- Name field → "Alice Johnson"
- Email field → "alice@example.com"
- Programming language → "Python"

## Future Enhancements

1. **Memory Confidence**: Show which memory was used for each field
2. **Manual Override**: Let user select which memory to use
3. **Memory Suggestions**: Suggest saving new info while filling forms
4. **Multi-value Fields**: Better handling of checkboxes and multi-select
5. **Memory Learning**: Learn from form submissions to improve matching

## Summary

Verse now remembers your information and uses it to fill forms intelligently! The system:
- ✅ Retrieves relevant memories for each form field
- ✅ Uses semantic search to find matching information
- ✅ Injects memory context into AI prompts
- ✅ Provides personalized, consistent answers
- ✅ Works with both Google Forms and universal forms
- ✅ Respects privacy (local storage only)

Your forms are now filled with **your** information, automatically! 🎯🧠✨
