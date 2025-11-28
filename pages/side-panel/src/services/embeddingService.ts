/**
 * Embedding service for semantic memory search
 * Supports OpenAI embeddings API with TF-IDF fallback
 */

import type { ExtractedMemory } from './memoryExtractor';

export interface MemoryWithEmbedding extends ExtractedMemory {
  embedding?: number[];
}

/**
 * Generate embedding using OpenAI API
 */
async function generateOpenAIEmbedding(text: string, apiKey: string): Promise<number[]> {
  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        input: text,
        model: 'text-embedding-3-small', // 1536 dimensions, $0.02 per 1M tokens
        encoding_format: 'float',
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  } catch (error) {
    console.error('Failed to generate OpenAI embedding:', error);
    throw error;
  }
}

/**
 * Simple TF-IDF based embedding fallback (when no API key available)
 * Creates a sparse vector representation of text
 */
function generateTFIDFEmbedding(text: string, vocabulary: string[]): number[] {
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2);

  // Term frequency
  const termFreq = new Map<string, number>();
  for (const word of words) {
    termFreq.set(word, (termFreq.get(word) || 0) + 1);
  }

  // Create vector based on vocabulary
  const vector = new Array(vocabulary.length).fill(0);
  for (let i = 0; i < vocabulary.length; i++) {
    const word = vocabulary[i];
    if (termFreq.has(word)) {
      vector[i] = termFreq.get(word)! / words.length; // Normalized TF
    }
  }

  return vector;
}

/**
 * Build vocabulary from all memories (for TF-IDF fallback)
 */
function buildVocabulary(memories: ExtractedMemory[]): string[] {
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

  // Limit vocabulary size to top 500 most common words
  return Array.from(wordSet).slice(0, 500);
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
 * Generate embedding for text using available method
 */
export async function generateEmbedding(text: string, apiKey?: string): Promise<number[]> {
  // Try OpenAI API first if key is available
  if (apiKey && apiKey.trim()) {
    try {
      return await generateOpenAIEmbedding(text, apiKey);
    } catch (error) {
      console.warn('OpenAI embedding failed, falling back to TF-IDF:', error);
    }
  }

  // Fallback: Use simple TF-IDF (requires vocabulary from existing memories)
  // This will be handled by the caller
  throw new Error('No embedding method available - need OpenAI API key or vocabulary');
}

/**
 * Generate embeddings for all memories that don't have them
 */
export async function generateMemoryEmbeddings(
  memories: MemoryWithEmbedding[],
  apiKey?: string,
): Promise<MemoryWithEmbedding[]> {
  const updated: MemoryWithEmbedding[] = [];

  // If using OpenAI, generate embeddings for memories without them
  if (apiKey && apiKey.trim()) {
    for (const memory of memories) {
      if (!memory.embedding || memory.embedding.length === 0) {
        try {
          const embedding = await generateEmbedding(memory.content, apiKey);
          updated.push({ ...memory, embedding });
          console.log('Generated embedding for memory:', memory.content.substring(0, 50));
        } catch (error) {
          console.error('Failed to generate embedding:', error);
          updated.push(memory);
        }
      } else {
        updated.push(memory);
      }
    }
    return updated;
  }

  // Fallback: Use TF-IDF for all memories
  console.log('Using TF-IDF fallback for embeddings');
  const vocabulary = buildVocabulary(memories);

  return memories.map(memory => {
    if (!memory.embedding || memory.embedding.length === 0) {
      const embedding = generateTFIDFEmbedding(memory.content, vocabulary);
      return { ...memory, embedding };
    }
    return memory;
  });
}

/**
 * Find relevant memories for a given query using semantic search
 */
export async function findRelevantMemories(
  query: string,
  memories: MemoryWithEmbedding[],
  apiKey?: string,
  topK = 5,
  minSimilarity = 0.5,
): Promise<Array<{ memory: MemoryWithEmbedding; similarity: number }>> {
  if (memories.length === 0) {
    return [];
  }

  // Generate query embedding
  let queryEmbedding: number[];

  if (apiKey && apiKey.trim()) {
    try {
      queryEmbedding = await generateEmbedding(query, apiKey);
    } catch (error) {
      console.warn('Failed to generate query embedding, using TF-IDF fallback');
      const vocabulary = buildVocabulary(memories);
      queryEmbedding = generateTFIDFEmbedding(query, vocabulary);
    }
  } else {
    // Use TF-IDF fallback
    const vocabulary = buildVocabulary(memories);
    queryEmbedding = generateTFIDFEmbedding(query, vocabulary);
  }

  // Calculate similarities
  const results: Array<{ memory: MemoryWithEmbedding; similarity: number }> = [];

  for (const memory of memories) {
    if (!memory.embedding || memory.embedding.length === 0) {
      continue;
    }

    try {
      const similarity = cosineSimilarity(queryEmbedding, memory.embedding);
      if (similarity >= minSimilarity) {
        results.push({ memory, similarity });
      }
    } catch (error) {
      console.error('Error calculating similarity:', error);
    }
  }

  // Sort by similarity (highest first) and return top K
  return results.sort((a, b) => b.similarity - a.similarity).slice(0, topK);
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
    const categoryEmoji = {
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
