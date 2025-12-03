/**
 * Embedding service for semantic memory search
 * Uses OpenAI embeddings API exclusively with internal API key
 */

import type { ExtractedMemory } from './memoryExtractor';

export interface MemoryWithEmbedding extends ExtractedMemory {
  embedding?: number[];
}

/**
 * Internal OpenAI API key for embeddings (from env)
 * Users don't need to provide their own key
 */
const OPENAI_EMBEDDING_KEY = import.meta.env.VITE_OPENAI_EMBEDDING_KEY || '';

/**
 * Generate embedding using OpenAI API
 */
async function generateOpenAIEmbedding(text: string): Promise<number[]> {
  if (!OPENAI_EMBEDDING_KEY) {
    throw new Error('OpenAI embedding API key not configured');
  }

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_EMBEDDING_KEY}`,
    },
    body: JSON.stringify({
      input: text,
      model: 'text-embedding-3-small', // 1536 dimensions, $0.02 per 1M tokens
      encoding_format: 'float',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Embedding] OpenAI API error:', response.status, errorText);
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(vec1: number[], vec2: number[]): number {
  if (vec1.length !== vec2.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    norm1 += vec1[i] * vec1[i];
    norm2 += vec2[i] * vec2[i];
  }

  const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2);
  return magnitude === 0 ? 0 : dotProduct / magnitude;
}

/**
 * Generate embedding for text using OpenAI
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  return await generateOpenAIEmbedding(text);
}

/**
 * Generate embeddings for all memories that don't have them
 * Uses internal OpenAI API key - no user key needed
 */
export async function generateMemoryEmbeddings(memories: MemoryWithEmbedding[]): Promise<MemoryWithEmbedding[]> {
  if (!OPENAI_EMBEDDING_KEY) {
    console.warn('[Embedding] No API key configured, skipping embedding generation');
    return memories;
  }

  const updated: MemoryWithEmbedding[] = [];

  for (const memory of memories) {
    if (!memory.embedding || memory.embedding.length === 0) {
      try {
        const embedding = await generateOpenAIEmbedding(memory.content);
        updated.push({ ...memory, embedding });
        console.log('[Embedding] Generated for:', memory.content.substring(0, 50));
      } catch (error) {
        console.error('[Embedding] Failed:', error);
        updated.push(memory);
      }
    } else {
      updated.push(memory);
    }
  }

  return updated;
}

/**
 * Extract keywords from query for fallback matching
 */
function extractQueryKeywords(query: string): string[] {
  const keywords = query
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2);

  // Common question words to look for specific info
  const infoKeywords: Record<string, string[]> = {
    hometown: ['hometown', 'home', 'town', 'city', 'live', 'from', 'location'],
    name: ['name', 'called', 'who'],
    email: ['email', 'mail', 'address'],
    phone: ['phone', 'number', 'call', 'mobile'],
    pizza: ['pizza', 'food', 'favorite', 'like', 'eat'],
    location: ['location', 'live', 'stay', 'city', 'place', 'where'],
    job: ['job', 'work', 'company', 'employment', 'occupation'],
  };

  const expanded: string[] = [...keywords];
  for (const [key, synonyms] of Object.entries(infoKeywords)) {
    if (keywords.some(k => synonyms.includes(k))) {
      expanded.push(key);
    }
  }

  return [...new Set(expanded)];
}

/**
 * Calculate keyword overlap score between query and memory
 */
function keywordMatchScore(query: string, memoryContent: string): number {
  const queryWords = new Set(
    query
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2),
  );
  const memoryWords = new Set(
    memoryContent
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2),
  );

  let matches = 0;
  for (const word of queryWords) {
    if (memoryWords.has(word)) {
      matches++;
    }
  }

  return queryWords.size > 0 ? matches / queryWords.size : 0;
}

/**
 * Find relevant memories for a given query using semantic search + keyword fallback
 * Uses internal OpenAI API key - no user key needed
 */
export async function findRelevantMemories(
  query: string,
  memories: MemoryWithEmbedding[],
  topK = 5,
  minSimilarity = 0.2,
): Promise<Array<{ memory: MemoryWithEmbedding; similarity: number }>> {
  if (memories.length === 0) {
    console.log('[MemorySearch] No memories to search');
    return [];
  }

  console.log(`[MemorySearch] Searching ${memories.length} memories for: "${query}"`);
  const results: Array<{ memory: MemoryWithEmbedding; similarity: number }> = [];

  // Strategy 1: Keyword matching (always works as fallback)
  const queryKeywords = extractQueryKeywords(query);
  console.log(`[MemorySearch] Query keywords: ${queryKeywords.join(', ')}`);

  for (const memory of memories) {
    const keywordScore = keywordMatchScore(query, memory.content);
    if (keywordScore > 0.3) {
      results.push({ memory, similarity: keywordScore });
      console.log(`[MemorySearch] Keyword match (${keywordScore.toFixed(2)}): ${memory.content.substring(0, 50)}...`);
    }
  }

  // Strategy 2: Embedding-based semantic search using OpenAI
  if (OPENAI_EMBEDDING_KEY) {
    try {
      const queryEmbedding = await generateOpenAIEmbedding(query);
      console.log('[MemorySearch] Generated OpenAI query embedding');

      // Calculate embedding similarities
      for (const memory of memories) {
        if (!memory.embedding || memory.embedding.length === 0) {
          continue;
        }

        // Check for dimension mismatch
        if (queryEmbedding.length !== memory.embedding.length) {
          console.log(
            `[MemorySearch] Dimension mismatch: query=${queryEmbedding.length}, memory=${memory.embedding.length}`,
          );
          continue;
        }

        try {
          const similarity = cosineSimilarity(queryEmbedding, memory.embedding);
          const existing = results.find(r => r.memory.content === memory.content);

          if (existing) {
            // Boost existing keyword match with embedding score
            existing.similarity = Math.max(existing.similarity, similarity);
          } else if (similarity >= minSimilarity) {
            results.push({ memory, similarity });
            console.log(
              `[MemorySearch] Embedding match (${similarity.toFixed(2)}): ${memory.content.substring(0, 50)}...`,
            );
          }
        } catch (error) {
          console.error('[MemorySearch] Error calculating similarity:', error);
        }
      }
    } catch (error) {
      console.warn('[MemorySearch] OpenAI embedding failed, using keyword matching only:', error);
    }
  } else {
    console.log('[MemorySearch] No API key, using keyword matching only');
  }

  // Sort by similarity (highest first) and return top K
  const topResults = results.sort((a, b) => b.similarity - a.similarity).slice(0, topK);
  console.log(`[MemorySearch] Returning ${topResults.length} relevant memories`);

  return topResults;
}

/**
 * Format relevant memories as context string for AI prompt
 */
export function formatMemoriesAsContext(
  relevantMemories: Array<{ memory: MemoryWithEmbedding; similarity: number }>,
): string {
  if (relevantMemories.length === 0) {
    return '';
  }

  const lines = ['[Relevant memories from previous conversations:]'];

  for (const { memory, similarity } of relevantMemories) {
    const categoryEmoji: Record<string, string> = {
      personal_info: '👤',
      preference: '⚙️',
      fact: 'ℹ️',
      goal: '🎯',
      skill: '💡',
      context: '📝',
    };

    const emoji = categoryEmoji[memory.category] || '•';
    lines.push(`${emoji} ${memory.content} (${(similarity * 100).toFixed(0)}% relevant)`);
  }

  lines.push(''); // Empty line separator
  return lines.join('\n');
}
