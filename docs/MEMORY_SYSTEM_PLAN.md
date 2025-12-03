# Memory System Architecture Plan

## Overview

This document outlines the design for a persistent memory system that allows Verse to remember important information about users and past conversations, similar to ChatGPT's memory feature. The system will automatically extract, store, and retrieve relevant memories to provide context-aware responses.

## Design Goals

1. **Persistent Memory**: Remember important facts across conversations
2. **Semantic Retrieval**: Find relevant memories using embedding-based similarity search
3. **Automatic Extraction**: Automatically identify and store important information
4. **Privacy-First**: All memory stored locally in the browser
5. **User Control**: Users can view, edit, and delete memories
6. **Integration**: Seamlessly integrate with existing LLM agents (Planner, Navigator)

## Architecture Components

### 1. Memory Storage Layer

**Location**: `packages/storage/lib/memory/`

**Structure**:
```typescript
interface Memory {
  id: string;
  content: string;           // The actual memory text
  embedding?: number[];      // Vector embedding for similarity search
  category: MemoryCategory;  // Type of memory (user_preference, fact, context, etc.)
  tags: string[];           // Optional tags for organization
  metadata: {
    createdAt: number;
    updatedAt: number;
    accessCount: number;     // How often this memory is retrieved
    importance: number;      // 0-1 score of how important this is
    sourceSessionId?: string; // Which conversation created this
    sourceMessageId?: string; // Which message created this
  };
}

enum MemoryCategory {
  USER_PREFERENCE = 'user_preference',  // User preferences (e.g., "I prefer dark mode")
  FACT = 'fact',                         // Factual information (e.g., "My name is John")
  CONTEXT = 'context',                   // Contextual information (e.g., "Working on project X")
  PAST_CONVERSATION = 'past_conversation', // Important past conversation details
  SKILL = 'skill',                       // Learned behaviors or patterns
  RELATIONSHIP = 'relationship',         // Information about relationships
}
```

**Storage Implementation**:
- Use `chrome.storage.local` for persistence (already have abstraction layer)
- Store memories in an indexed structure for fast retrieval
- Keep embeddings separate from content for efficient updates
- Support pagination and filtering

### 2. Memory Extraction Layer

**Location**: `chrome-extension/src/background/memory/extractor.ts`

**Responsibilities**:
- Analyze conversation messages to identify important information
- Use LLM to extract structured memories from unstructured text
- Score memories for importance
- Deduplicate similar memories

**Extraction Strategy**:
1. **Real-time Extraction**: After each conversation turn, analyze the exchange
2. **Batch Extraction**: Periodically review recent conversations
3. **Explicit Extraction**: When user explicitly says "remember this" or similar

**LLM Prompt for Extraction**:
```
You are a memory extraction system. Analyze the conversation and identify:
1. Personal facts about the user (name, preferences, etc.)
2. Important context that should be remembered
3. User preferences or habits
4. Tasks or goals mentioned
5. Any information the user explicitly wants remembered

Return a JSON array of memory objects with:
- content: A concise, standalone description of what to remember
- category: One of [user_preference, fact, context, past_conversation, skill, relationship]
- importance: Score from 0-1 indicating how important this is
- tags: Optional relevant tags
```

### 3. Memory Embedding Service

**Location**: `chrome-extension/src/background/memory/embeddings.ts`

**Responsibilities**:
- Generate embeddings for memories using an embedding model
- Store embeddings efficiently
- Handle embedding model selection (OpenAI, Ollama, etc.)

**Implementation**:
- Use the same LLM provider system as the main agents
- Cache embeddings to avoid regeneration
- Support batch embedding generation
- Handle embedding dimension differences across models

**Embedding Storage**:
- Store embeddings separately from memory content
- Use typed arrays for efficient storage
- Compress if necessary (e.g., quantize to float16)

### 4. Memory Retrieval Service

**Location**: `chrome-extension/src/background/memory/retriever.ts`

**Responsibilities**:
- Retrieve relevant memories based on query context
- Use semantic similarity search
- Rank memories by relevance and importance
- Filter by category or tags if needed

**Retrieval Strategy**:
1. **Query Embedding**: Generate embedding for the current query/conversation context
2. **Similarity Search**: Find top-k most similar memories using cosine similarity
3. **Reranking**: Combine similarity score with importance score
4. **Context Injection**: Format retrieved memories for LLM context

**Retrieval Algorithm**:
```
1. Generate embedding for current context
2. Compute cosine similarity with all memory embeddings
3. Combine scores: final_score = 0.7 * similarity + 0.3 * importance
4. Select top-k memories (default: 5-10)
5. Filter by recency if needed (only use recent memories for certain contexts)
```

### 5. Memory Integration Layer

**Location**: `chrome-extension/src/background/memory/integration.ts`

**Integration Points**:

**A. Planner Agent Integration**:
- Inject relevant memories into Planner's system prompt
- Add memory context section before user task
- Format: "Previous context: [memory 1], [memory 2], ..."

**B. Navigator Agent Integration**:
- Provide memory context in Navigator's prompt
- Help Navigator remember user preferences for form filling, etc.

**C. Memory-Aware Prompts**:
- Modify system prompts to reference memory
- Add instructions: "Use the provided memories to personalize responses"

**Memory Injection Format**:
```
<memory_context>
Here are relevant memories from past conversations:
- Memory 1: [content]
- Memory 2: [content]
...
</memory_context>
```

### 6. Memory Management API

**Location**: `packages/storage/lib/memory/index.ts`

**Public API**:
```typescript
interface MemoryStorage {
  // CRUD Operations
  createMemory(memory: Omit<Memory, 'id' | 'metadata'>): Promise<Memory>;
  updateMemory(id: string, updates: Partial<Memory>): Promise<Memory>;
  deleteMemory(id: string): Promise<void>;
  getMemory(id: string): Promise<Memory | null>;
  getAllMemories(filters?: MemoryFilters): Promise<Memory[]>;
  
  // Retrieval
  searchMemories(query: string, options?: SearchOptions): Promise<Memory[]>;
  getRelevantMemories(context: string, limit?: number): Promise<Memory[]>;
  
  // Bulk Operations
  importMemories(memories: Memory[]): Promise<void>;
  exportMemories(): Promise<Memory[]>;
  clearAllMemories(): Promise<void>;
  
  // Statistics
  getMemoryStats(): Promise<MemoryStats>;
}

interface MemoryFilters {
  category?: MemoryCategory;
  tags?: string[];
  minImportance?: number;
  dateRange?: { start: number; end: number };
}

interface SearchOptions {
  limit?: number;
  filters?: MemoryFilters;
  threshold?: number; // Minimum similarity score
}
```

## Implementation Phases

### Phase 1: Core Storage & Basic CRUD
**Files to Create**:
- `packages/storage/lib/memory/types.ts` - Type definitions
- `packages/storage/lib/memory/index.ts` - Storage implementation
- `packages/storage/lib/memory/utils.ts` - Helper functions

**Deliverables**:
- Memory storage with Chrome storage backend
- Basic CRUD operations
- Memory indexing and metadata tracking

### Phase 2: Embedding Generation
**Files to Create**:
- `chrome-extension/src/background/memory/embeddings.ts` - Embedding service
- `chrome-extension/src/background/memory/models.ts` - Embedding model config

**Deliverables**:
- Embedding generation using configured LLM provider
- Embedding storage and caching
- Support for multiple embedding models

### Phase 3: Memory Extraction
**Files to Create**:
- `chrome-extension/src/background/memory/extractor.ts` - Extraction logic
- `chrome-extension/src/background/memory/deduplicator.ts` - Deduplication

**Deliverables**:
- Automatic memory extraction from conversations
- Importance scoring
- Deduplication of similar memories

### Phase 4: Memory Retrieval
**Files to Create**:
- `chrome-extension/src/background/memory/retriever.ts` - Retrieval service
- `chrome-extension/src/background/memory/similarity.ts` - Similarity calculations

**Deliverables**:
- Semantic similarity search
- Memory ranking and filtering
- Context-aware retrieval

### Phase 5: Agent Integration
**Files to Modify**:
- `chrome-extension/src/background/agent/executor.ts` - Inject memories
- `chrome-extension/src/background/agent/prompts/templates/planner.ts` - Add memory section
- `chrome-extension/src/background/agent/prompts/templates/navigator.ts` - Add memory section
- `chrome-extension/src/background/memory/integration.ts` - Integration helpers

**Deliverables**:
- Memory context injection into agent prompts
- Memory-aware responses
- Background extraction after conversations

### Phase 6: UI & User Management
**Files to Create**:
- `pages/side-panel/src/features/memory/MemoryManager.tsx` - Memory management UI
- `pages/side-panel/src/features/memory/MemoryList.tsx` - Memory list view
- `pages/side-panel/src/features/memory/MemoryEditor.tsx` - Edit/delete memories

**Files to Modify**:
- `pages/side-panel/src/SidePanel.tsx` - Add memory management section
- `pages/side-panel/src/features/index.ts` - Register memory feature

**Deliverables**:
- User interface to view all memories
- Edit and delete capabilities
- Memory search UI
- Memory statistics dashboard

## Data Flow

### Memory Creation Flow
```
1. User sends message → Executor processes
2. After response → Memory Extractor analyzes conversation
3. Extractor uses LLM to identify important information
4. New memories created with content and metadata
5. Embeddings generated for new memories
6. Memories stored in Chrome storage
```

### Memory Retrieval Flow
```
1. User sends message → Executor processes
2. Before sending to Planner → Memory Retriever called
3. Retriever generates embedding for current context
4. Similarity search finds relevant memories
5. Top-k memories selected and formatted
6. Memories injected into Planner/Navigator prompt
7. Agents use memory context to generate personalized response
```

## Storage Schema

### Chrome Storage Keys

```
memory_index: MemoryIndex {
  lastUpdated: number;
  totalMemories: number;
  categories: { [category: string]: number };
  version: string; // For schema migrations
}

memories_{id}: Memory {
  // Individual memory object
}

memory_embeddings: { [id: string]: number[] } {
  // Embeddings stored separately for efficiency
}

memory_tags_index: { [tag: string]: string[] } {
  // Reverse index: tag -> memory IDs
}

memory_category_index: { [category: string]: string[] } {
  // Reverse index: category -> memory IDs
}
```

## Performance Considerations

1. **Embedding Generation**: 
   - Cache embeddings to avoid regeneration
   - Use batch API calls when possible
   - Consider using smaller/faster embedding models

2. **Similarity Search**:
   - For large memory sets (>1000), consider approximate nearest neighbor (ANN)
   - Could use a simple in-memory index for fast retrieval
   - Implement pagination for memory browsing

3. **Storage Limits**:
   - Chrome storage.local limit: ~10MB
   - Monitor memory count and warn users
   - Implement automatic pruning of low-importance, old memories

4. **Background Processing**:
   - Extraction can be async and non-blocking
   - Use background jobs for batch operations
   - Throttle embedding generation to avoid rate limits

## Privacy & Security

1. **Local Storage Only**: All memories stored in browser, never sent to server
2. **User Control**: Users can view, edit, delete any memory
3. **Sensitive Data Detection**: Filter out potential PII (SSN, credit cards, etc.)
4. **Export/Import**: Users can export memories for backup or delete all
5. **No Memory Sharing**: Memories are per-user, per-browser

## Edge Cases & Error Handling

1. **No Embeddings Available**: Fall back to keyword-based search
2. **Embedding Generation Failure**: Store memory without embedding, retry later
3. **Storage Full**: Warn user, suggest deleting old memories
4. **Invalid Memory Format**: Validate and sanitize before storage
5. **LLM Provider Changes**: Regenerate embeddings when provider changes

## Testing Strategy

1. **Unit Tests**: Storage operations, similarity calculations
2. **Integration Tests**: Extraction → Storage → Retrieval flow
3. **E2E Tests**: Full conversation flow with memory injection
4. **Performance Tests**: Embedding generation time, search latency

## Future Enhancements

1. **Memory Consolidation**: Automatically merge similar memories
2. **Memory Forgetting**: Automatically remove irrelevant/old memories
3. **Memory Confidence**: Track how often retrieved memories are useful
4. **Contextual Memory**: Different memory sets for different domains (work, personal)
5. **Memory Sharing**: Optional sharing of memories across devices (if user wants)
6. **Memory Templates**: Pre-defined memory categories for common use cases
7. **Memory Suggestions**: Proactive suggestions to remember new information

## Example Use Cases

### Use Case 1: User Preference
```
User: "I prefer using dark mode"
→ Memory extracted: { content: "User prefers dark mode", category: "user_preference" }
→ Future: When user asks "change the theme", agent remembers dark mode preference
```

### Use Case 2: Personal Fact
```
User: "My name is John and I work at Acme Corp"
→ Memories extracted: 
  - { content: "User's name is John", category: "fact" }
  - { content: "User works at Acme Corp", category: "fact" }
→ Future: Agent can personalize responses using this information
```

### Use Case 3: Past Conversation Context
```
User: "Remember that I'm working on the Q4 marketing campaign"
→ Memory extracted: { content: "User is working on Q4 marketing campaign", category: "context" }
→ Future: When user asks "What was I working on?", agent retrieves this memory
```

### Use Case 4: Form Filling Preferences
```
User: "When filling forms, always use my work email: john@acme.com"
→ Memory extracted: { content: "Use work email john@acme.com for form filling", category: "user_preference" }
→ Future: Form filler automatically uses this email
```

## Migration Strategy

1. **Version 1.0**: Implement core memory system without embeddings (keyword search)
2. **Version 1.1**: Add embedding support for semantic search
3. **Version 1.2**: Add UI for memory management
4. **Version 2.0**: Advanced features (consolidation, forgetting, etc.)

## Success Metrics

1. **Memory Accuracy**: Percentage of memories that are actually useful when retrieved
2. **Retrieval Relevance**: How often retrieved memories are relevant to the query
3. **User Engagement**: How often users view/edit memories
4. **Performance**: Time to generate embeddings, search latency
5. **Storage Efficiency**: Average memory size, storage usage

## Conclusion

This memory system will make Verse more personalized and context-aware, remembering important information across conversations. The modular architecture ensures easy integration with existing systems while maintaining privacy and performance.

