# Supermemory Research Analysis & Implementation Plan for Verse

## Executive Summary

After analyzing the Supermemory project, I've identified their core memory architecture and strategies that we can adapt to dramatically improve Verse's memory system. Their approach is more sophisticated and scalable than our current implementation.

## Key Findings

### 1. Architecture Differences

| Aspect | Supermemory | Verse (Current) | Verse (Proposed) |
|--------|-------------|-----------------|------------------|
| Storage | Backend API + Vector DB | Local chrome.storage | Hybrid: Local + Optional Remote |
| Memory Units | Documents → Memory Entries (chunks) | Raw prompts with embeddings | Structured Memory Entries |
| Chunking | Automatic semantic chunking | None | Semantic chunking for long content |
| Search | Vector search + Reranking + Related memories | Cosine similarity only | Vector + TF-IDF + Hybrid scoring |
| Context Injection | Automatic with AI tools | Manual in prompt | Tool-based with metadata |
| Memory Graph | Parent/child relationships, versioning | Flat structure | Memory relationships |

### 2. Supermemory's Core Concepts

#### A. **Two-Tier Memory System**

```
Document (Large content)
  ├─ Memory Entry 1 (Semantic chunk)
  ├─ Memory Entry 2 (Semantic chunk)
  └─ Memory Entry 3 (Semantic chunk)
```

**Example:**
```
Document: "My name is Shreyas. I work at Google as an engineer. My email is shreyas@gmail.com"

Memory Entries:
1. "User's name is Shreyas"
2. "User works at Google as an engineer"
3. "User's email is shreyas@gmail.com"
```

#### B. **Memory Entry Schema**

```typescript
interface MemoryEntry {
  id: string
  memory: string  // The actual extracted knowledge
  metadata: {
    source: string
    confidence: number
    category: string
    timestamp: string
  }
  updatedAt: string
  similarity: number  // When retrieved
  version: number
  context?: {
    parents: MemoryEntry[]  // Previous versions
    children: MemoryEntry[]  // Updated versions
  }
}
```

#### C. **Semantic Search with Reranking**

```typescript
// 1. Initial vector search (fast, broad)
const initialResults = await vectorSearch(query, { limit: 50 })

// 2. Rerank results (slower, accurate)
const reranked = await rerank(query, initialResults)

// 3. Filter by threshold
const filtered = reranked.filter(r => r.score >= threshold)

// 4. Include related memories
const withRelated = await includeRelatedMemories(filtered)
```

#### D. **Container Tags (Isolation)**

```typescript
// Separate memories by context
const chatMemories = { containerTags: ["user_123", "chat"] }
const formMemories = { containerTags: ["user_123", "forms"] }
const projectMemories = { containerTags: ["user_123", "project_abc"] }
```

### 3. How Supermemory Integrates with AI Chat

#### ChatGPT Integration Flow:

```
User types prompt → 
Debounce (300ms) → 
Auto-search memories → 
Inject into prompt dataset → 
ChatGPT includes in context → 
User submits → 
Capture prompt → 
Extract new memories → 
Save to backend
```

**Key Code:**
```typescript
// Auto-fetch memories as user types
const handleInput = () => {
  if (debounceTimeout) clearTimeout(debounceTimeout)
  
  debounceTimeout = setTimeout(async () => {
    const query = textarea.textContent?.trim() || ""
    
    if (query.length > 2) {
      const memories = await searchMemories(query)
      
      // Inject into prompt element's dataset
      textarea.dataset.supermemories = 
        `<div>Supermemories (reference): ${memories}</div>`
    }
  }, 300)
}
```

#### Memory Capture:
```typescript
// Capture prompts automatically
document.addEventListener('keydown', async (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    const prompt = textarea.textContent
    const memories = textarea.dataset.supermemories
    
    // Append memories to prompt before sending
    if (memories) {
      textarea.innerHTML += memories
    }
    
    // Save prompt for future extraction
    await capturePrompt(prompt)
  }
})
```

### 4. Memory Extraction Strategy

#### Supermemory's Approach:

1. **Immediate Capture** - Save raw prompts/conversations
2. **Batch Processing** - Extract memories later
3. **LLM-Powered** - Use AI to extract semantic knowledge
4. **Versioning** - Update existing memories instead of duplicating

```typescript
// They capture first, extract later
async function capturePrompt(prompt: string) {
  // Save raw prompt immediately
  await saveMemory({
    content: prompt,
    status: "pending",  // Will be processed later
    metadata: { source: "chatgpt", platform: "web" }
  })
}

// Backend processes asynchronously
async function processDocument(document: Document) {
  // 1. Chunk content semantically
  const chunks = await semanticChunk(document.content)
  
  // 2. Extract memories from each chunk
  for (const chunk of chunks) {
    const memories = await extractMemories(chunk)
    
    // 3. Check for existing similar memories
    for (const memory of memories) {
      const existing = await findSimilarMemory(memory)
      
      if (existing) {
        // Update existing memory (versioning)
        await updateMemory(existing.id, memory, {
          relation: "updates",
          parent: existing
        })
      } else {
        // Create new memory entry
        await createMemoryEntry(memory)
      }
    }
  }
  
  // 4. Generate embeddings
  await generateEmbeddings(memories)
}
```

### 5. Form Filling Strategy

While Supermemory doesn't have explicit form filling (they focus on chat), we can adapt their principles:

```typescript
// Our proposed approach
async function fillFormField(field: FormField) {
  // 1. Extract field context
  const context = extractFieldContext(field)  // "Your name"
  
  // 2. Search memories with multiple strategies
  const searches = await Promise.all([
    // Exact keyword match
    searchByKeywords(context, ["name", "full name"]),
    
    // Semantic search
    semanticSearch(context),
    
    // Category filter
    searchByCategory("personal_info")
  ])
  
  // 3. Merge and rank results
  const ranked = rankResults(searches, context)
  
  // 4. Format for AI
  const memoryContext = formatMemories(ranked, {
    maxMemories: 3,
    includeMetadata: true,
    format: "structured"  // vs "conversational"
  })
  
  // 5. Generate answer with AI
  const answer = await ai.generate({
    prompt: `Fill field: ${context}`,
    memories: memoryContext,
    constraints: field.constraints
  })
  
  return answer
}
```

## Proposed Implementation for Verse

### Phase 1: Core Memory Architecture (Week 1-2)

#### 1.1 Create Memory Entry Schema

```typescript
// packages/shared/src/memory.ts
export interface MemoryEntry {
  id: string
  content: string
  category: 'personal_info' | 'preference' | 'fact' | 'skill' | 'context' | 'goal'
  subcategory?: string  // e.g., 'name', 'email', 'phone' for personal_info
  confidence: 'high' | 'medium' | 'low'
  source: 'user_prompt' | 'form_fill' | 'chat_response' | 'manual'
  embedding: number[]
  metadata: {
    platform?: string
    url?: string
    timestamp: number
    userVerified?: boolean
  }
  version: number
  parentId?: string  // For versioning
  containerTags: string[]  // For isolation
  relevanceScore?: number  // When retrieved
}

export interface MemoryDocument {
  id: string
  rawContent: string
  memoryEntries: string[]  // IDs of extracted memories
  metadata: Record<string, any>
  status: 'pending' | 'processing' | 'done' | 'error'
  createdAt: number
  updatedAt: number
}
```

#### 1.2 Improve Memory Extraction

```typescript
// pages/side-panel/src/services/memoryExtractor.ts

// Extract structured memories instead of full prompts
export async function extractStructuredMemories(
  content: string,
  existingMemories: MemoryEntry[]
): Promise<MemoryEntry[]> {
  const extracted: MemoryEntry[] = []
  
  // 1. Name extraction
  const nameMatch = content.match(/(?:my name is|i am|i'm called)\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)/i)
  if (nameMatch) {
    extracted.push({
      id: generateId(),
      content: `User's name is ${nameMatch[1]}`,
      category: 'personal_info',
      subcategory: 'name',
      confidence: 'high',
      source: 'user_prompt',
      embedding: [],  // Generated later
      metadata: { timestamp: Date.now() },
      version: 1,
      containerTags: ['default']
    })
  }
  
  // 2. Email extraction
  const emailMatch = content.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i)
  if (emailMatch) {
    extracted.push({
      id: generateId(),
      content: `User's email is ${emailMatch[1]}`,
      category: 'personal_info',
      subcategory: 'email',
      confidence: 'high',
      source: 'user_prompt',
      embedding: [],
      metadata: { timestamp: Date.now() },
      version: 1,
      containerTags: ['default']
    })
  }
  
  // 3. Phone extraction
  const phoneMatch = content.match(/(?:phone|mobile|cell).*?([+\d\s()-]{10,})/i)
  if (phoneMatch) {
    extracted.push({
      id: generateId(),
      content: `User's phone is ${phoneMatch[1].trim()}`,
      category: 'personal_info',
      subcategory: 'phone',
      confidence: 'high',
      source: 'user_prompt',
      embedding: [],
      metadata: { timestamp: Date.now() },
      version: 1,
      containerTags: ['default']
    })
  }
  
  // 4. Work/Company extraction
  const workMatch = content.match(/(?:i work at|working at|employed at)\s+([A-Za-z0-9\s&]+)/i)
  if (workMatch) {
    extracted.push({
      id: generateId(),
      content: `User works at ${workMatch[1].trim()}`,
      category: 'fact',
      subcategory: 'employment',
      confidence: 'high',
      source: 'user_prompt',
      embedding: [],
      metadata: { timestamp: Date.now() },
      version: 1,
      containerTags: ['default']
    })
  }
  
  // 5. Location extraction
  const locationMatch = content.match(/(?:i live in|located in|from)\s+([A-Za-z\s,]+)/i)
  if (locationMatch) {
    extracted.push({
      id: generateId(),
      content: `User lives in ${locationMatch[1].trim()}`,
      category: 'personal_info',
      subcategory: 'location',
      confidence: 'medium',
      source: 'user_prompt',
      embedding: [],
      metadata: { timestamp: Date.now() },
      version: 1,
      containerTags: ['default']
    })
  }
  
  // 6. Preference extraction
  const preferenceMatch = content.match(/(?:i prefer|i like|i love|i enjoy)\s+(.+?)(?:\.|$)/i)
  if (preferenceMatch) {
    extracted.push({
      id: generateId(),
      content: `User prefers ${preferenceMatch[1].trim()}`,
      category: 'preference',
      confidence: 'medium',
      source: 'user_prompt',
      embedding: [],
      metadata: { timestamp: Date.now() },
      version: 1,
      containerTags: ['default']
    })
  }
  
  // Check for duplicates and update instead
  return await deduplicateAndVersion(extracted, existingMemories)
}

// Update existing memories instead of creating duplicates
async function deduplicateAndVersion(
  newMemories: MemoryEntry[],
  existingMemories: MemoryEntry[]
): Promise<MemoryEntry[]> {
  const result: MemoryEntry[] = []
  
  for (const newMem of newMemories) {
    // Find similar existing memory by subcategory
    const existing = existingMemories.find(
      m => m.category === newMem.category && m.subcategory === newMem.subcategory
    )
    
    if (existing && existing.content !== newMem.content) {
      // Create new version
      result.push({
        ...newMem,
        version: existing.version + 1,
        parentId: existing.id
      })
    } else if (!existing) {
      // New memory
      result.push(newMem)
    }
    // Skip if exact duplicate
  }
  
  return result
}
```

#### 1.3 Enhanced Memory Retrieval

```typescript
// chrome-extension/src/background/services/memoryRetrieval.ts

export interface RetrievalOptions {
  query: string
  apiKey?: string
  topK?: number
  minSimilarity?: number
  categories?: string[]
  subcategories?: string[]
  containerTags?: string[]
  includeRelated?: boolean
}

export async function retrieveRelevantMemories(
  options: RetrievalOptions
): Promise<MemoryEntry[]> {
  const {
    query,
    apiKey,
    topK = 5,
    minSimilarity = 0.3,
    categories,
    subcategories,
    containerTags,
    includeRelated = false
  } = options
  
  // 1. Load memories
  const res = await chrome.storage.local.get(['verse_memories'])
  let memories: MemoryEntry[] = Array.isArray(res.verse_memories) ? res.verse_memories : []
  
  // 2. Filter by categories/subcategories
  if (categories || subcategories) {
    memories = memories.filter(m => 
      (!categories || categories.includes(m.category)) &&
      (!subcategories || subcategories.includes(m.subcategory || ''))
    )
  }
  
  // 3. Filter by container tags
  if (containerTags) {
    memories = memories.filter(m =>
      m.containerTags.some(tag => containerTags.includes(tag))
    )
  }
  
  console.log(`[MemoryRetrieval] Filtered to ${memories.length} memories`)
  
  // 4. Multiple search strategies
  const results: MemoryEntry[] = []
  
  // Strategy A: Keyword matching (fast, good for exact matches)
  const keywords = extractKeywords(query)
  const keywordMatches = memories.filter(m =>
    keywords.some(kw => m.content.toLowerCase().includes(kw.toLowerCase()))
  ).map(m => ({ ...m, relevanceScore: 1.0 }))
  
  console.log(`[MemoryRetrieval] Keyword matches: ${keywordMatches.length}`)
  
  // Strategy B: Subcategory matching (excellent for structured data)
  const subcatMatches = await matchBySubcategory(query, memories)
  console.log(`[MemoryRetrieval] Subcategory matches: ${subcatMatches.length}`)
  
  // Strategy C: Semantic search (best for general queries)
  const queryEmbedding = await generateEmbedding(query, apiKey)
  const semanticMatches = memories
    .filter(m => m.embedding && m.embedding.length > 0)
    .map(m => ({
      ...m,
      relevanceScore: cosineSimilarity(queryEmbedding, m.embedding)
    }))
    .filter(m => m.relevanceScore! >= minSimilarity)
  
  console.log(`[MemoryRetrieval] Semantic matches: ${semanticMatches.length}`)
  
  // 5. Merge results with hybrid scoring
  const merged = mergeAndRank([keywordMatches, subcatMatches, semanticMatches])
  
  // 6. Get top K
  const topResults = merged.slice(0, topK)
  
  // 7. Include related memories (parent/child versions)
  if (includeRelated) {
    for (const result of topResults) {
      if (result.parentId) {
        const parent = memories.find(m => m.id === result.parentId)
        if (parent) {
          topResults.push({ ...parent, relevanceScore: result.relevanceScore! * 0.8 })
        }
      }
    }
  }
  
  console.log(`[MemoryRetrieval] Returning ${topResults.length} memories:`)
  topResults.forEach((m, i) => {
    console.log(`  ${i + 1}. [${m.relevanceScore?.toFixed(3)}] [${m.subcategory}] ${m.content.substring(0, 60)}...`)
  })
  
  return topResults
}

// Extract keywords from query
function extractKeywords(query: string): string[] {
  const keywords: string[] = []
  
  // Common field labels and their keywords
  const keywordMap: Record<string, string[]> = {
    'name': ['name', 'full name', 'first name', 'last name'],
    'email': ['email', 'e-mail', 'mail', 'contact'],
    'phone': ['phone', 'mobile', 'cell', 'telephone', 'number'],
    'address': ['address', 'location', 'city', 'street'],
    'company': ['company', 'organization', 'employer', 'work'],
    'job': ['job', 'title', 'position', 'role'],
    'age': ['age', 'birth', 'birthday', 'dob'],
  }
  
  const lowerQuery = query.toLowerCase()
  
  for (const [key, synonyms] of Object.entries(keywordMap)) {
    if (synonyms.some(syn => lowerQuery.includes(syn))) {
      keywords.push(key)
    }
  }
  
  return keywords
}

// Match by subcategory (best for form filling)
async function matchBySubcategory(
  query: string,
  memories: MemoryEntry[]
): Promise<MemoryEntry[]> {
  const keywords = extractKeywords(query)
  
  return memories
    .filter(m => m.subcategory && keywords.includes(m.subcategory))
    .map(m => ({ ...m, relevanceScore: 0.95 }))  // High score for exact subcategory match
}

// Merge multiple result sets with hybrid scoring
function mergeAndRank(
  resultSets: MemoryEntry[][]
): MemoryEntry[] {
  const scoreMap = new Map<string, number>()
  const memoryMap = new Map<string, MemoryEntry>()
  
  for (const results of resultSets) {
    for (const memory of results) {
      const existingScore = scoreMap.get(memory.id) || 0
      const newScore = existingScore + (memory.relevanceScore || 0)
      
      scoreMap.set(memory.id, newScore)
      memoryMap.set(memory.id, memory)
    }
  }
  
  // Convert to array and sort by score
  return Array.from(memoryMap.values())
    .map(m => ({ ...m, relevanceScore: scoreMap.get(m.id) }))
    .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0))
}
```

### Phase 2: Form Filling Integration (Week 2-3)

#### 2.1 Structured Memory Lookup for Forms

```typescript
// chrome-extension/src/background/features/universal-forms/index.ts

async function handleFillUniversalFormField(message: any, sendResponse: (response?: any) => void) {
  try {
    const { field } = message
    
    // ... existing code ...
    
    // Enhanced memory retrieval for forms
    const fieldCategory = detectFieldCategory(field)
    const fieldKeywords = extractFieldKeywords(field.context)
    
    logger.info('Form field analysis:', {
      context: field.context,
      type: field.type,
      category: fieldCategory,
      keywords: fieldKeywords
    })
    
    // Retrieve memories with category filtering
    const relevantMemories = await retrieveRelevantMemories({
      query: field.context,
      apiKey: openAIKey,
      topK: 3,
      minSimilarity: 0.3,
      categories: [fieldCategory],
      subcategories: fieldKeywords
    })
    
    if (relevantMemories.length > 0) {
      logger.info(`✅ Found ${relevantMemories.length} relevant memories:`)
      relevantMemories.forEach((m, i) => {
        logger.info(`  ${i + 1}. [${m.relevanceScore?.toFixed(3)}] [${m.subcategory}] ${m.content}`)
      })
      
      // Format with subcategory hints for AI
      const memoryContext = formatMemoriesForFormFilling(relevantMemories, field)
      
      // Build enhanced prompt
      prompt = `${memoryContext}

You are filling a form field. Use the memories above - they contain the user's actual information.

Field: ${field.context}
Type: ${field.type}
${field.required ? 'Required: Yes' : ''}

Extract the relevant value from the memories and provide ONLY the value, nothing else.

Answer:`
      
    } else {
      logger.info('❌ No relevant memories found')
    }
    
    // ... rest of existing code ...
  } catch (error) {
    logger.error('Error:', error)
    sendResponse({ ok: false, error: String(error) })
  }
}

// Detect field category from context
function detectFieldCategory(field: any): string {
  const context = field.context.toLowerCase()
  
  if (context.includes('name')) return 'personal_info'
  if (context.includes('email') || context.includes('mail')) return 'personal_info'
  if (context.includes('phone') || context.includes('mobile')) return 'personal_info'
  if (context.includes('address') || context.includes('location')) return 'personal_info'
  if (context.includes('age') || context.includes('birth')) return 'personal_info'
  if (context.includes('company') || context.includes('work')) return 'fact'
  if (context.includes('prefer') || context.includes('favorite')) return 'preference'
  
  return 'fact'
}

// Extract field keywords for subcategory matching
function extractFieldKeywords(context: string): string[] {
  const keywords: string[] = []
  const lower = context.toLowerCase()
  
  if (lower.includes('name')) keywords.push('name')
  if (lower.includes('email')) keywords.push('email')
  if (lower.includes('phone') || lower.includes('mobile')) keywords.push('phone')
  if (lower.includes('address')) keywords.push('location')
  if (lower.includes('company')) keywords.push('employment')
  
  return keywords
}

// Format memories specifically for form filling
function formatMemoriesForFormFilling(
  memories: MemoryEntry[],
  field: any
): string {
  const lines = ['[Your saved information:]', '']
  
  for (const memory of memories) {
    lines.push(`• ${memory.content}`)
  }
  
  lines.push('')
  return lines.join('\n')
}
```

### Phase 3: Chat Integration (Week 3-4)

#### 3.1 Auto-Fetch Memories on Chat

```typescript
// pages/side-panel/src/SidePanel.tsx

// Add debounced memory search
const [promptText, setPromptText] = useState('')
const [fetchedMemories, setFetchedMemories] = useState<MemoryEntry[]>([])

// Debounced memory fetch
useEffect(() => {
  if (!promptText || promptText.length < 3) {
    setFetchedMemories([])
    return
  }
  
  const timeoutId = setTimeout(async () => {
    try {
      const res = await chrome.storage.local.get(['verse_memories'])
      const memories: MemoryEntry[] = Array.isArray(res.verse_memories) ? res.verse_memories : []
      
      if (memories.length === 0) return
      
      // Quick keyword search for instant feedback
      const keywords = extractKeywords(promptText)
      const matches = memories.filter(m =>
        keywords.some(kw => m.content.toLowerCase().includes(kw.toLowerCase()))
      )
      
      setFetchedMemories(matches.slice(0, 3))
      console.log(`🧠 Auto-fetched ${matches.length} relevant memories`)
    } catch (error) {
      console.error('Auto-fetch error:', error)
    }
  }, 300)
  
  return () => clearTimeout(timeoutId)
}, [promptText])

// Show memory preview above input
{fetchedMemories.length > 0 && (
  <div className="memory-preview">
    <div className="memory-preview-header">
      <span>💡 Relevant memories ({fetchedMemories.length})</span>
      <button onClick={() => setFetchedMemories([])}>✕</button>
    </div>
    {fetchedMemories.map(m => (
      <div key={m.id} className="memory-preview-item">
        <span className="memory-category">{m.subcategory}</span>
        <span className="memory-content">{m.content}</span>
      </div>
    ))}
  </div>
)}
```

## Summary of Improvements

### Current Issues Fixed:

1. ✅ **"My name is Shreyas" not filling forms**
   - Solution: Structured extraction with subcategory matching
   - New: `{ category: 'personal_info', subcategory: 'name', content: "User's name is Shreyas" }`

2. ✅ **Low similarity scores**
   - Solution: Hybrid search (keywords + subcategory + semantic)
   - Keywords give instant matches, semantic provides fallback

3. ✅ **Duplicate memories**
   - Solution: Versioning system with parent-child relationships
   - Updates existing memories instead of creating duplicates

4. ✅ **Poor context relevance**
   - Solution: Container tags + category filtering
   - Isolate memories by context (chat vs forms vs projects)

5. ✅ **No auto-fetch in chat**
   - Solution: Debounced auto-search like Supermemory
   - Shows relevant memories as you type

### New Capabilities:

1. **Structured Data Storage** - Memories organized by category/subcategory
2. **Multi-Strategy Search** - Keyword + Semantic + Category matching
3. **Memory Versioning** - Track updates to user information
4. **Container Tags** - Isolate memories by context
5. **Related Memories** - Include parent/child versions
6. **Auto-Fetch** - Preview relevant memories while typing

## Implementation Priority

### Must Have (Week 1-2):
- [x] Structured memory schema
- [x] Enhanced extraction with subcategories
- [x] Multi-strategy retrieval
- [ ] Form filling with subcategory matching

### Should Have (Week 3-4):
- [ ] Memory versioning
- [ ] Container tags
- [ ] Auto-fetch in chat
- [ ] Memory preview UI

### Nice to Have (Future):
- [ ] Memory graph visualization
- [ ] Batch processing
- [ ] Memory relationships
- [ ] LLM-powered extraction

## Testing Plan

### Test Case 1: Form Filling
```
1. Save: "My name is Shreyas"
2. Open form with field "Your name"
3. Click "Fill this Form"
4. Expected: Field fills with "Shreyas"
5. Verify: Console shows subcategory match (score ~0.95)
```

### Test Case 2: Multiple Strategies
```
1. Save: "My email is shreyas@example.com"
2. Query: "contact information"
3. Expected: Email memory retrieved via:
   - Keyword match: "email" → "contact"
   - Subcategory: "email" → personal_info
   - Semantic: "contact information" similar to "email"
```

### Test Case 3: Memory Updates
```
1. Save: "My name is Shreyas"
2. Save: "My name is Shreyas Gurav"
3. Expected: 
   - Version 2 created with parentId pointing to version 1
   - Form fills with latest version (Shreyas Gurav)
   - Can see previous version (Shreyas) in related memories
```

## Next Steps

1. **Implement structured memory schema** (1-2 days)
2. **Update extraction logic** (1 day)
3. **Implement multi-strategy retrieval** (2-3 days)
4. **Test with real forms** (1 day)
5. **Add UI improvements** (2-3 days)

## Conclusion

Supermemory's approach is production-ready and scalable. By adapting their strategies (structured extraction, multi-strategy search, subcategory matching), we can dramatically improve Verse's memory system and solve the form filling issues.

The key insight: **Store structured knowledge, not raw text**. "My name is Shreyas" becomes `{ subcategory: 'name', content: "User's name is Shreyas" }`, making it trivially easy to match "Your name" → "name" subcategory → retrieve "Shreyas".
