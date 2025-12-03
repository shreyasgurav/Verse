/**
 * Memory Retrieval Service for Background Scripts
 * Retrieves relevant memories to provide context for form filling and other tasks
 * Uses internal OpenAI API key - no user key needed
 */

import type { MemoryWithEmbedding } from '../../../../pages/side-panel/src/services/embeddingService';

/**
 * Internal OpenAI API key for embeddings (from env)
 */
const OPENAI_EMBEDDING_KEY = import.meta.env.VITE_OPENAI_EMBEDDING_KEY || '';

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(vec1: number[], vec2: number[]): number {
  if (vec1.length !== vec2.length) {
    return 0;
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
 * Generate embedding using OpenAI API with internal key
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
      model: 'text-embedding-3-small',
      encoding_format: 'float',
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

/**
 * Extract keywords from query for matching
 */
function extractKeywords(query: string): string[] {
  const keywords: string[] = [];
  const lowerQuery = query.toLowerCase();

  // Common field labels and their keywords
  const keywordMap: Record<string, string[]> = {
    name: ['name', 'full name', 'first name', 'last name', 'your name'],
    email: ['email', 'e-mail', 'mail', 'contact email', 'email address'],
    phone: ['phone', 'mobile', 'cell', 'telephone', 'number', 'contact number'],
    location: ['address', 'location', 'city', 'street', 'where', 'live'],
    company: ['company', 'organization', 'employer', 'work at', 'workplace'],
    employment: ['job', 'title', 'position', 'role', 'work'],
    school: ['school', 'college', 'university', 'institute', 'education', 'studying', 'student'],
    degree: ['degree', 'major', 'field of study', 'qualification'],
  };

  for (const [subcategory, synonyms] of Object.entries(keywordMap)) {
    if (synonyms.some(syn => lowerQuery.includes(syn))) {
      keywords.push(subcategory);
    }
  }

  return keywords;
}

/**
 * Retrieve relevant memories for a query
 * Uses internal OpenAI API key - no user key needed
 */
export async function retrieveRelevantMemories(
  query: string,
  topK = 3,
  minSimilarity = 0.2,
): Promise<Array<{ content: string; category: string; similarity: number; subcategory?: string }>> {
  try {
    // Load memories from storage
    const res = await chrome.storage.local.get(['verse_memories']);
    const memories: MemoryWithEmbedding[] = Array.isArray(res.verse_memories) ? res.verse_memories : [];

    console.log(`[MemoryRetrieval] Query: "${query}"`);
    console.log(`[MemoryRetrieval] Total memories: ${memories.length}`);

    if (memories.length === 0) {
      console.log('[MemoryRetrieval] No memories found in storage');
      return [];
    }

    const results: Array<{ content: string; category: string; similarity: number; subcategory?: string }> = [];

    // Strategy 1: Keyword matching (always works)
    const keywords = extractKeywords(query);
    console.log(`[MemoryRetrieval] Extracted keywords: ${keywords.join(', ')}`);

    for (const memory of memories) {
      if (memory.subcategory && keywords.includes(memory.subcategory)) {
        results.push({
          content: memory.content,
          category: memory.category,
          subcategory: memory.subcategory,
          similarity: 0.95,
        });
        console.log(`[MemoryRetrieval] ⭐ Keyword match: ${memory.content.substring(0, 60)}...`);
      }
    }

    // Strategy 2: Embedding-based semantic search using OpenAI
    if (OPENAI_EMBEDDING_KEY) {
      try {
        const queryEmbedding = await generateOpenAIEmbedding(query);
        console.log('[MemoryRetrieval] Generated OpenAI query embedding');

        for (const memory of memories) {
          if (!memory.embedding || memory.embedding.length === 0) {
            continue;
          }

          // Check dimension match
          if (queryEmbedding.length !== memory.embedding.length) {
            continue;
          }

          try {
            const similarity = cosineSimilarity(queryEmbedding, memory.embedding);
            const existing = results.find(r => r.content === memory.content);

            if (existing) {
              existing.similarity = Math.max(existing.similarity, similarity);
            } else if (similarity >= minSimilarity) {
              results.push({
                content: memory.content,
                category: memory.category,
                subcategory: memory.subcategory,
                similarity,
              });
              console.log(
                `[MemoryRetrieval] Embedding match (${similarity.toFixed(2)}): ${memory.content.substring(0, 60)}...`,
              );
            }
          } catch (error) {
            console.error('[MemoryRetrieval] Error calculating similarity:', error);
          }
        }
      } catch (error) {
        console.warn('[MemoryRetrieval] OpenAI embedding failed, using keyword matching only:', error);
      }
    } else {
      console.log('[MemoryRetrieval] No API key, using keyword matching only');
    }

    console.log(`[MemoryRetrieval] Found ${results.length} memories`);

    // Sort by similarity and return top K
    const topResults = results.sort((a, b) => b.similarity - a.similarity).slice(0, topK);
    if (topResults.length > 0) {
      console.log(`[MemoryRetrieval] Returning top ${topResults.length} memories:`);
      topResults.forEach((r, i) => {
        console.log(`  ${i + 1}. [${r.similarity.toFixed(3)}] ${r.content.substring(0, 60)}...`);
      });
    }
    return topResults;
  } catch (error) {
    console.error('[MemoryRetrieval] Error retrieving memories:', error);
    return [];
  }
}

/**
 * Format memories as context string for prompts
 */
export function formatMemoriesForPrompt(
  memories: Array<{ content: string; category: string; similarity: number }>,
): string {
  if (memories.length === 0) {
    return '';
  }

  const lines = ['[Relevant information from your saved memories:]'];

  for (const memory of memories) {
    const categoryEmoji = {
      preference: '⚙️',
      fact: 'ℹ️',
      goal: '🎯',
      skill: '💡',
      context: '📝',
    };

    const emoji = categoryEmoji[memory.category as keyof typeof categoryEmoji] || '•';
    lines.push(`${emoji} ${memory.content}`);
  }

  lines.push(''); // Empty line separator
  return lines.join('\n');
}
