# Verse Memory System

## Table of Contents
- [Overview](#overview)
- [Architecture](#architecture)
- [How It Works](#how-it-works)
- [Implementation Details](#implementation-details)
- [Form Filling Integration](#form-filling-integration)
- [Testing Guide](#testing-guide)
- [Troubleshooting](#troubleshooting)
- [Future Enhancements](#future-enhancements)

## Overview

Verse features an intelligent memory system inspired by ChatGPT and Supermemory that automatically extracts and stores only **important, non-duplicate information** from user prompts. The system uses structured storage with subcategories, semantic embeddings, and multi-strategy retrieval to provide context-aware responses and intelligent form filling.

### Key Features

- **Automatic Extraction**: Identifies and stores important information from conversations
- **Duplicate Prevention**: Uses similarity matching to avoid duplicates
- **Semantic Retrieval**: Finds relevant memories using embedding-based similarity search
- **Structured Storage**: Organized by categories and subcategories for quick lookup
- **Form Filling Integration**: Automatically uses memories to fill forms
- **Privacy-First**: All memory stored locally in the browser

## Architecture

### Storage Structure

Memories are stored with the following structure:

```typescript
interface Memory {
  id: string;
  content: string;           // The actual memory text
  embedding?: number[];      // Vector embedding for similarity search
  category: string;          // Type: personal_info, fact, preference, etc.
  subcategory?: string;      // Specific type: name, email, phone, etc.
  importance: string;        // high, medium, low
  confidence: string;        // high, medium, low
  timestamp: number;         // When created/updated
}
```

### Memory Categories

- **personal_info**: Personal information (name, email, phone, etc.)
- **fact**: Factual information
- **preference**: User preferences
- **goal**: Goals and objectives
- **skill**: Skills and capabilities
- **context**: Contextual information

### Subcategories

Personal information subcategories enable precise matching:
- `name` - Full name, first name, last name
- `email` - Email address
- `phone` - Phone number
- `location` - Address, city, location
- `company` - Company, organization, employer
- `school` - School, college, university

## How It Works

### 1. Smart Extraction

The system analyzes each prompt using pattern matching to identify:
- **Preferences**: "I like...", "I prefer...", "I always..."
- **Personal Facts**: "I am...", "My name is...", "I work at..."
- **Goals**: "I want to...", "I'm trying to...", "My goal is..."
- **Skills**: "I know...", "I can...", "I'm good at..."
- **Important Context**: "Remember...", "Note that...", "For future reference..."

### 2. Structured Extraction

Memories are extracted with consistent structure:

```typescript
// Name extraction
"My name is Shreyas" → {
  content: "User's name is Shreyas",
  category: "personal_info",
  subcategory: "name"
}

// Email extraction
"my email is shreyas@email.com" → {
  content: "User's email is shreyas@email.com",
  category: "personal_info",
  subcategory: "email"
}
```

### 3. Duplicate Prevention

- Uses **Jaccard similarity** to compare new memories with existing ones
- Threshold: 70% similarity = duplicate
- Updates existing memories instead of creating duplicates
- Checks subcategories for exact matches (score: 0.95)

### 4. Semantic Embeddings

**Embeddings Generation:**
- **Primary**: OpenAI `text-embedding-3-small` API (1536 dimensions, $0.02/1M tokens)
- **Fallback**: TF-IDF based embeddings when no API key available
- Embeddings generated automatically when memories are saved
- Stored alongside memory content in `chrome.storage.local`

**Semantic Search:**
- Uses **cosine similarity** to find relevant memories
- Retrieves top 5 most relevant memories (>50% similarity threshold)
- Searches across all memory categories

### 5. Multi-Strategy Memory Retrieval

The system uses a hybrid search approach:

```
Query: "Your name"
    ↓
1. Extract Keywords: ["name"]
    ↓
2. Subcategory Match: Find memories with subcategory="name" (Score: 0.95)
    ↓
3. Semantic Search: Cosine similarity with embeddings (Score: 0.3-1.0)
    ↓
4. Merge Results: Boost subcategory matches
    ↓
5. Return Top Results
```

**Keyword Mapping:**
```typescript
{
  'name': ['name', 'full name', 'first name', 'last name', 'your name'],
  'email': ['email', 'e-mail', 'mail', 'contact email'],
  'phone': ['phone', 'mobile', 'cell', 'telephone', 'number'],
  'location': ['address', 'location', 'city', 'street'],
  'company': ['company', 'organization', 'employer'],
  'school': ['school', 'college', 'university', 'study']
}
```

### 6. Context Injection

Automatically finds relevant memories for each user prompt and injects them before sending to AI:

```
[Relevant memories from previous conversations:]
⚙️ I prefer dark mode (95% relevant)
ℹ️ My name is John (87% relevant)

[User's actual prompt]
```

## Implementation Details

### Files and Components

**Core Files:**
- `packages/shared/src/memory.ts` - Type definitions
- `pages/side-panel/src/services/memoryExtractor.ts` - Extraction logic
- `chrome-extension/src/background/services/memoryRetrieval.ts` - Retrieval service
- `pages/side-panel/src/services/embeddingService.ts` - Embedding generation

**Storage:**
- Uses `chrome.storage.local`
- Key: `verse_memories`
- Limit: 200 most recent memories
- Format: Array of memory objects with embeddings

### Extraction Logic

The extractor identifies patterns and structures the data:

```typescript
// Pattern matching examples
"My name is {name}" → personal_info/name
"My email is {email}" → personal_info/email
"I work at {company}" → fact/company
"I prefer {preference}" → preference
```

### Retrieval Process

1. **Query Processing**: Extract keywords and generate query embedding
2. **Subcategory Matching**: Fast lookup for exact field types
3. **Semantic Search**: Cosine similarity across all memories
4. **Score Merging**: Combine subcategory (0.95) + semantic (0.3-1.0)
5. **Ranking**: Sort by final score and return top results

## Form Filling Integration

### How Form Filling Works

```
Form Field: "Your name"
    ↓
1. Extract keyword: "name"
    ↓
2. Find memories with subcategory="name"
    ↓
3. Found: "User's name is Shreyas" (score: 0.95)
    ↓
4. Inject into AI prompt with context
    ↓
5. AI responds: "Shreyas"
    ↓
6. Field filled! ✅
```

### Integration Points

**Google Forms** (`chrome-extension/src/background/features/google-forms/index.ts`):
- Retrieves top 3 relevant memories per question
- Injects memory context into prompt
- AI uses memories to answer multiple choice and text questions

**Universal Forms** (`chrome-extension/src/background/features/universal-forms/index.ts`):
- Retrieves top 3 relevant memories per field
- Injects memory context into prompt
- AI uses memories to fill any form field

### Example Flow

**Scenario:** Google Form asks "Your name"

1. User saved: "My name is Shreyas"
   - Extracted as: `{ content: "User's name is Shreyas", category: "personal_info", subcategory: "name" }`

2. User opens form with field "Your name"

3. User clicks "Fill this Form"

4. Memory retrieval:
   - Extract keywords: ["name"]
   - Find memories with subcategory="name"
   - Found: "User's name is Shreyas" (score: 0.95)

5. AI receives prompt with memory context:
   ```
   [Relevant information from your saved memories:]
   ℹ️ User's name is Shreyas
   
   Question: Your name
   Answer (be brief and direct):
   ```

6. AI responds: "Shreyas"

7. Form field filled! ✅

## Testing Guide

### Test 1: Basic Name Extraction

```bash
# 1. Build the extension
pnpm build

# 2. In Verse side panel, send:
"My name is Shreyas"

# 3. Check console for:
Memory added: personal_info - User's name is Shreyas

# 4. Open Google Form with name field
# 5. Click "Fill this Form"
# 6. Should see: Field filled with "Shreyas"
```

### Test 2: Multiple Fields

```bash
# 1. Send in Verse:
"My name is Shreyas, email shreyas@example.com, phone 555-1234"

# 2. Check console shows 3 memories:
Memory added: personal_info - User's name is Shreyas
Memory added: personal_info - User's email is shreyas@example.com
Memory added: personal_info - User's phone number is 555-1234

# 3. Open form with Name, Email, Phone fields
# 4. Click "Fill this Form"
# 5. All fields should fill correctly
```

### Test 3: Subcategory Matching

```javascript
// In browser console:
chrome.storage.local.get(['verse_memories'], (res) => {
  console.log('Memories with subcategories:')
  res.verse_memories?.forEach(m => {
    console.log(`- [${m.subcategory}] ${m.content}`)
  })
})
```

### Console Output Examples

**Memory Saving:**
```
Memory extraction: Found 1 important memories
Memory added: personal_info - User's name is Shreyas
🔑 Using OpenAI API key from providers for embeddings
✅ Memory save complete: 1 added, 0 updated, embeddings generated
```

**Form Filling:**
```
[google-forms] Searching memories for question: Your name
[MemoryRetrieval] Query: "Your name"
[MemoryRetrieval] Total memories: 3
[MemoryRetrieval] Extracted keywords: name
[MemoryRetrieval] ⭐ Subcategory match added: User's name is Shreyas (name)
[MemoryRetrieval] Returning top 1 memories:
  1. [0.950] User's name is Shreyas
[google-forms] ✅ Found 1 relevant memories for question: Your name
[google-forms] Question: Your name Answer: Shreyas
```

## Troubleshooting

### Issue: Form fields not filling

**Check:**
1. Are memories saved with subcategories? (Check console)
2. Is OpenAI API key configured? (Check settings)
3. Are embeddings generated? (Check console for "embeddings generated")
4. Is form field label extracting correctly? (Check logs for "Query:")

**Solution:**
- Rebuild the extension (`pnpm build`)
- Re-save the information (e.g., "My name is Shreyas" again)
- Check that OpenAI API key is configured in settings

### Issue: Old memories don't have subcategories

**Solution:** Re-save the information or manually add memories through the settings page

### Issue: Duplicate memories

**Solution:** The system automatically prevents duplicates. If you see duplicates, they may have different subcategories or low similarity scores. Consider manually removing duplicates from settings.

### Issue: Memory not retrieved

**Check:**
1. Memory has embedding? (Required for semantic search)
2. Query keyword matches subcategory?
3. Similarity score above threshold (0.3)?

## Future Enhancements

### Planned Improvements

1. **Memory Versioning**: Track updates to existing memories (parent-child relationships)
2. **Container Tags**: Isolate memories by context (chat vs forms vs projects)
3. **Auto-Fetch in Chat**: Show relevant memories as you type (like Supermemory)
4. **Memory Graph**: Visualize relationships between memories
5. **Batch Processing**: Process multiple memories at once
6. **Memory Decay**: Automatically fade less-used memories over time
7. **Export/Import**: Backup and restore memories
8. **LLM-powered Extraction**: Use actual LLM API for more accurate extraction

### Implementation Priority

**Must Have:**
- ✅ Structured memory schema
- ✅ Enhanced extraction with subcategories
- ✅ Multi-strategy retrieval
- ✅ Form filling with subcategory matching

**Should Have:**
- Memory versioning
- Container tags
- Auto-fetch in chat
- Memory preview UI

**Nice to Have:**
- Memory graph visualization
- Batch processing
- Memory relationships
- Transformers.js for local embeddings

## Summary

The Verse Memory System provides intelligent, context-aware information storage and retrieval:

- **Structured Storage**: Categories and subcategories for precise matching
- **Multi-Strategy Search**: Keyword + subcategory + semantic similarity
- **Automatic Extraction**: Identifies important information from conversations
- **Form Integration**: Seamlessly fills forms using saved memories
- **Privacy-First**: All data stored locally in your browser

**Key Insight:** Store structured knowledge, not raw text. The system transforms "My name is Shreyas" into structured data with subcategories, enabling precise matching for form fields and other use cases.


