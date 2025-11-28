# Verse Intelligent Memory System

## Overview

Verse now features an intelligent memory system inspired by ChatGPT and Supermemory that automatically extracts and stores only **important, non-duplicate information** from user prompts.

## How It Works

### 1. Smart Extraction
The system analyzes each prompt using pattern matching to identify:
- **Preferences**: "I like...", "I prefer...", "I always..."
- **Personal Facts**: "I am...", "My name is...", "I work at..."
- **Goals**: "I want to...", "I'm trying to...", "My goal is..."
- **Skills**: "I know...", "I can...", "I'm good at..."
- **Important Context**: "Remember...", "Note that...", "For future reference..."

### 2. Duplicate Prevention
- Uses **Jaccard similarity** to compare new memories with existing ones
- Threshold: 70% similarity = duplicate
- Updates existing memories instead of creating duplicates
- Prefers newer, more detailed information when merging

### 3. Memory Categories
Each memory is tagged with:
- **Category**: preference, fact, goal, skill, context
- **Importance**: high, medium, low
- **Confidence**: high, medium, low
- **Timestamp**: when it was created/updated

### 4. What Gets Saved

✅ **Saved:**
- "I prefer dark mode for coding"
- "My name is John and I work at Google"
- "I'm trying to build a Chrome extension"
- "I know Python and JavaScript"
- "Remember to always use TypeScript strict mode"

❌ **Not Saved:**
- "Click the login button" (simple action)
- "What is the weather today?" (query)
- "Navigate to google.com" (navigation command)
- "Summarize this page" (utility command)

## UI Features

### Memory Button
- Located in the side panel header
- Click to toggle memory view
- Shows tooltip: "View saved prompts"

### Memory Display
Each memory shows:
- **Color-coded category badge**:
  - 🟣 Purple = Preference
  - 🔵 Blue = Fact
  - 🟢 Green = Goal
  - 🟠 Orange = Skill
  - ⚫ Gray = Context
- **Importance indicator**:
  - ⭐ = High importance
  - ◆ = Medium importance
  - ○ = Low importance
- **Timestamp**: When saved/updated
- **Delete button**: Remove individual memories

## Technical Architecture

### Files Created
- `pages/side-panel/src/services/memoryExtractor.ts`
  - Pattern-based extraction logic
  - Similarity calculation (Jaccard)
  - Duplicate detection and merging

### Files Modified
- `pages/side-panel/src/SidePanel.tsx`
  - Integrated memory extraction
  - Updated storage logic
  - Enhanced UI with categories

### Storage
- Uses `chrome.storage.local`
- Key: `verse_memories`
- Limit: 200 most recent memories
- Format: Array of `ExtractedMemory` objects

## Console Logging

The system logs its decisions:
```
Memory extraction: Found 2 important memories
Memory added: preference - I prefer dark mode for coding
Memory updated: fact - My name is John and I work at Google
Memory save complete: 1 added, 1 updated
```

Or when nothing important is found:
```
Memory extraction: No important information to save - Simple action/query command
```

## Semantic Memory Retrieval ✅

### How It Works

**Embeddings Generation:**
- **Primary**: OpenAI `text-embedding-3-small` API (1536 dimensions, $0.02/1M tokens)
- **Fallback**: TF-IDF based embeddings when no API key available
- Embeddings generated automatically when memories are saved
- Stored alongside memory content in `chrome.storage.local`

**Semantic Search:**
- Uses **cosine similarity** to find relevant memories
- Retrieves top 5 most relevant memories (>50% similarity threshold)
- Searches across all memory categories

**Context Injection:**
- Automatically finds relevant memories for each user prompt
- Injects memory context before sending to AI
- Format:
  ```
  [Relevant memories from previous conversations:]
  ⚙️ I prefer dark mode (95% relevant)
  ℹ️ My name is John (87% relevant)
  
  [User's actual prompt]
  ```

### Example Flow

1. **User sends:** "Help me code in my preferred language"
2. **System retrieves:** Memory "I prefer using Python" (92% similarity)
3. **AI receives:**
   ```
   [Relevant memories from previous conversations:]
   💡 I prefer using Python (92% relevant)
   
   Help me code in my preferred language
   ```
4. **AI responds** with Python code (context-aware!)

### Configuration

- Automatically uses OpenAI API key from provider settings
- Falls back to TF-IDF if no API key configured
- No additional setup required

## Future Enhancements

Potential improvements:
1. **LLM-based extraction**: Use actual LLM API to extract memories (more accurate) ✅ DONE
2. **Semantic embeddings**: Use vector embeddings for better similarity matching ✅ DONE
3. **Memory search**: Search through saved memories
4. **Memory insights**: Show statistics and patterns
5. **Export/Import**: Backup and restore memories
6. **Memory decay**: Automatically fade less-used memories over time
7. **Context injection**: Automatically inject relevant memories into prompts ✅ DONE
8. **Transformers.js**: Add local embedding model option (no API required)

## Inspiration

This system is inspired by:
- **ChatGPT Memory**: Automatic extraction, categorization, confidence levels
- **Supermemory**: Smart forgetting, recency bias, context rewriting, hierarchical layers

## Usage Example

**User sends:** "I prefer using pnpm for package management and I always write tests first"

**System extracts:**
1. Memory (preference, high importance):
   - "I prefer using pnpm for package management"
2. Memory (preference, high importance):
   - "I always write tests first"

**User sends later:** "I prefer using pnpm instead of npm"

**System updates:**
- Finds similar memory (70%+ match)
- Updates existing memory with newer information
- No duplicate created ✅

## Testing

To test the system:
1. Build and load the extension: `pnpm build`
2. Open side panel
3. Send prompts with personal information:
   - "My name is [name]"
   - "I prefer [preference]"
   - "I'm trying to [goal]"
4. Click "Memory" button to view saved memories
5. Try sending similar information again - it should update, not duplicate
6. Send action commands - they should NOT be saved
