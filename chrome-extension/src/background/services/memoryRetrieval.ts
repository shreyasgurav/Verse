/**
 * Memory Retrieval Service for Background Scripts
 * Retrieves relevant memories to provide context for form filling and other tasks
 */

import type { MemoryWithEmbedding } from '../../../../pages/side-panel/src/services/embeddingService';

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
 * Simple TF-IDF based embedding (fallback when no OpenAI key)
 */
function generateTFIDFEmbedding(text: string, vocabulary: string[]): number[] {
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2);

  const termFreq = new Map<string, number>();
  for (const word of words) {
    termFreq.set(word, (termFreq.get(word) || 0) + 1);
  }

  const vector = new Array(vocabulary.length).fill(0);
  for (let i = 0; i < vocabulary.length; i++) {
    const word = vocabulary[i];
    if (termFreq.has(word)) {
      vector[i] = termFreq.get(word)! / words.length;
    }
  }

  return vector;
}

/**
 * Build vocabulary from memories
 */
function buildVocabulary(memories: MemoryWithEmbedding[]): string[] {
  const wordSet = new Set<string>();

  for (const memory of memories) {
    const words = memory.content
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2);

    for (const word of words) {
      wordSet.add(word);
    }
  }

  return Array.from(wordSet).slice(0, 500);
}

/**
 * Generate embedding using OpenAI API
 */
async function generateOpenAIEmbedding(text: string, apiKey: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
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
    company: ['company', 'organization', 'employer', 'work at'],
    employment: ['job', 'title', 'position', 'role', 'work'],
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
 */
export async function retrieveRelevantMemories(
  query: string,
  apiKey?: string,
  topK = 3,
  minSimilarity = 0.3, // Lowered from 0.5 to 0.3 for better matching
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

    // Generate query embedding
    let queryEmbedding: number[];

    if (apiKey && apiKey.trim()) {
      try {
        queryEmbedding = await generateOpenAIEmbedding(query, apiKey);
      } catch (error) {
        console.warn('[MemoryRetrieval] OpenAI embedding failed, using TF-IDF fallback');
        const vocabulary = buildVocabulary(memories);
        queryEmbedding = generateTFIDFEmbedding(query, vocabulary);
      }
    } else {
      // Use TF-IDF fallback
      const vocabulary = buildVocabulary(memories);
      queryEmbedding = generateTFIDFEmbedding(query, vocabulary);
    }

    // Calculate similarities
    const results: Array<{ content: string; category: string; similarity: number; subcategory?: string }> = [];
    let memoriesWithEmbeddings = 0;

    for (const memory of memories) {
      if (!memory.embedding || memory.embedding.length === 0) {
        console.log(`[MemoryRetrieval] Skipping memory without embedding: ${memory.content.substring(0, 50)}...`);
        continue;
      }
      memoriesWithEmbeddings++;

      try {
        const similarity = cosineSimilarity(queryEmbedding, memory.embedding);
        console.log(`[MemoryRetrieval] Similarity ${similarity.toFixed(3)}: ${memory.content.substring(0, 60)}...`);
        if (similarity >= minSimilarity) {
          results.push({
            content: memory.content,
            category: memory.category,
            subcategory: memory.subcategory,
            similarity,
          });
        }
      } catch (error) {
        console.error('[MemoryRetrieval] Error calculating similarity:', error);
      }
    }

    console.log(`[MemoryRetrieval] Checked ${memoriesWithEmbeddings} memories with embeddings`);
    console.log(`[MemoryRetrieval] Found ${results.length} memories above threshold ${minSimilarity}`);

    // Strategy: Keyword/Subcategory matching (highest priority for form filling)
    const keywords = extractKeywords(query);
    console.log(`[MemoryRetrieval] Extracted keywords: ${keywords.join(', ')}`);

    if (keywords.length > 0) {
      for (const memory of memories) {
        // Check if memory subcategory matches extracted keywords
        if (memory.subcategory && keywords.includes(memory.subcategory)) {
          const existing = results.find(r => r.content === memory.content);
          if (existing) {
            // Boost score for subcategory match
            existing.similarity = Math.max(existing.similarity, 0.95);
            console.log(
              `[MemoryRetrieval] ⭐ Subcategory match boosted: ${memory.content.substring(0, 60)}... (${memory.subcategory})`,
            );
          } else {
            // Add with high score
            results.push({
              content: memory.content,
              category: memory.category,
              subcategory: memory.subcategory,
              similarity: 0.95,
            });
            console.log(
              `[MemoryRetrieval] ⭐ Subcategory match added: ${memory.content.substring(0, 60)}... (${memory.subcategory})`,
            );
          }
        }
      }
    }

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
