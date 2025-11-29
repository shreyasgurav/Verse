/**
 * Intelligent memory extraction service
 * Identifies important information from user prompts using LLM
 * Based on ChatGPT and Supermemory memory patterns
 *
 * Enhanced with structured subcategories for better form filling
 */

// Define types locally until @extension/shared exports them
export type MemoryCategory = 'personal_info' | 'preference' | 'fact' | 'skill' | 'context' | 'goal';
export type MemorySubcategory =
  | 'name'
  | 'email'
  | 'phone'
  | 'location'
  | 'age'
  | 'birthday'
  | 'employment'
  | 'job_title'
  | 'company'
  | 'education'
  | 'degree'
  | 'school'
  | 'hobby'
  | 'skill_specific'
  | 'preference_specific'
  | 'general';

export interface ExtractedMemory {
  content: string;
  category: MemoryCategory;
  subcategory?: MemorySubcategory;
  importance: 'high' | 'medium' | 'low';
  confidence: 'high' | 'medium' | 'low';
  timestamp: number;
}

export interface MemoryExtractionResult {
  shouldSave: boolean;
  memories: ExtractedMemory[];
  reasoning?: string;
}

/**
 * Analyzes a user prompt to extract important, memorable information
 * Uses simple heuristics and pattern matching (can be enhanced with LLM later)
 */
export async function extractMemoriesFromPrompt(
  prompt: string,
  existingMemories: ExtractedMemory[] = [],
): Promise<MemoryExtractionResult> {
  const trimmed = prompt.trim();

  // Skip empty or very short prompts
  if (!trimmed || trimmed.length < 10) {
    return { shouldSave: false, memories: [] };
  }

  // Skip common navigation/action commands
  const skipPatterns = [
    /^(click|scroll|navigate|go to|open|close|search for)/i,
    /^(find|show me|what is|how do|can you)/i,
    /^(summarize|explain|tell me about)/i,
  ];

  if (skipPatterns.some(pattern => pattern.test(trimmed))) {
    return { shouldSave: false, memories: [], reasoning: 'Simple action/query command' };
  }

  const memories: ExtractedMemory[] = [];
  const lowerPrompt = trimmed.toLowerCase();

  // Pattern 1: User preferences (I like, I prefer, I want, I always, I usually)
  const preferencePatterns = [
    /(?:i|my)\s+(?:like|love|prefer|enjoy|want|need|always|usually|typically)/i,
    /(?:i'm|i am)\s+(?:interested in|a fan of|into)/i,
    /my\s+(?:favorite|preferred|usual)/i,
  ];

  if (preferencePatterns.some(pattern => pattern.test(trimmed))) {
    // Check if similar preference already exists
    const isDuplicate = existingMemories.some(
      mem => mem.category === 'preference' && calculateSimilarity(mem.content, trimmed) > 0.7,
    );

    if (!isDuplicate) {
      memories.push({
        content: trimmed,
        category: 'preference',
        importance: 'high',
        confidence: 'high',
        timestamp: Date.now(),
      });
    }
  }

  // Pattern 2: Personal facts (I am, I work, I live, my name is)
  const factPatterns = [
    /(?:i am|i'm)\s+(?:a|an|the|from)/i,
    /my\s+name\s+is/i,
    /i\s+(?:work|live|study|teach)\s+(?:at|in|as)/i,
    /i\s+have\s+(?:a|an|the|\d+)/i,
    /my\s+(?:email|phone|address|age)/i,
  ];

  if (factPatterns.some(pattern => pattern.test(trimmed))) {
    const isDuplicate = existingMemories.some(
      mem => mem.category === 'fact' && calculateSimilarity(mem.content, trimmed) > 0.7,
    );

    if (!isDuplicate) {
      memories.push({
        content: trimmed,
        category: 'fact',
        importance: 'high',
        confidence: 'high',
        timestamp: Date.now(),
      });
    }

    // Also extract structured data for common fields
    // This helps with form filling by creating more specific memories
    const nameMatch = trimmed.match(/(?:my\s+name\s+is|i\s+am|i'm)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i);
    if (nameMatch && nameMatch[1]) {
      const name = nameMatch[1].trim();
      const nameMemory = `User's name is ${name}`;
      const nameExists = existingMemories.some(
        mem => mem.subcategory === 'name' && calculateSimilarity(mem.content, nameMemory) > 0.7,
      );
      if (!nameExists) {
        memories.push({
          content: nameMemory,
          category: 'personal_info',
          subcategory: 'name',
          importance: 'high',
          confidence: 'high',
          timestamp: Date.now(),
        });
      }
    }

    // Extract email
    const emailMatch = trimmed.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
    if (emailMatch && emailMatch[1]) {
      const email = emailMatch[1];
      const emailMemory = `User's email is ${email}`;
      const emailExists = existingMemories.some(
        mem => mem.subcategory === 'email' && calculateSimilarity(mem.content, emailMemory) > 0.7,
      );
      if (!emailExists) {
        memories.push({
          content: emailMemory,
          category: 'personal_info',
          subcategory: 'email',
          importance: 'high',
          confidence: 'high',
          timestamp: Date.now(),
        });
      }
    }

    // Extract phone
    const phoneMatch = trimmed.match(/(?:phone|mobile|cell|number)(?:\s+is)?\s*:?\s*([+\d\s()-]{10,})/i);
    if (phoneMatch && phoneMatch[1]) {
      const phone = phoneMatch[1].trim();
      const phoneMemory = `User's phone number is ${phone}`;
      const phoneExists = existingMemories.some(
        mem => mem.subcategory === 'phone' && calculateSimilarity(mem.content, phoneMemory) > 0.7,
      );
      if (!phoneExists) {
        memories.push({
          content: phoneMemory,
          category: 'personal_info',
          subcategory: 'phone',
          importance: 'high',
          confidence: 'high',
          timestamp: Date.now(),
        });
      }
    }
  }

  // Pattern 3: Goals and intentions (I want to, I need to, I'm trying to, my goal is)
  const goalPatterns = [
    /(?:i want to|i need to|i'm trying to|i plan to|i hope to)/i,
    /my\s+goal\s+is/i,
    /i'm\s+(?:working on|building|creating|developing)/i,
  ];

  if (goalPatterns.some(pattern => pattern.test(trimmed))) {
    const isDuplicate = existingMemories.some(
      mem => mem.category === 'goal' && calculateSimilarity(mem.content, trimmed) > 0.7,
    );

    if (!isDuplicate) {
      memories.push({
        content: trimmed,
        category: 'goal',
        importance: 'high',
        confidence: 'high',
        timestamp: Date.now(),
      });
    }
  }

  // Pattern 4: Skills and expertise (I know, I can, I'm good at, I'm experienced in)
  const skillPatterns = [
    /i\s+(?:know|understand|can|am good at|am experienced in|specialize in)/i,
    /i'm\s+(?:familiar with|proficient in|skilled at)/i,
  ];

  if (skillPatterns.some(pattern => pattern.test(trimmed))) {
    const isDuplicate = existingMemories.some(
      mem => mem.category === 'skill' && calculateSimilarity(mem.content, trimmed) > 0.7,
    );

    if (!isDuplicate) {
      memories.push({
        content: trimmed,
        category: 'skill',
        importance: 'medium',
        confidence: 'high',
        timestamp: Date.now(),
      });
    }
  }

  // Pattern 5: Important context (remember, note that, keep in mind, for future reference)
  const contextPatterns = [
    /(?:remember|note|keep in mind|for future reference|don't forget)/i,
    /(?:always|never|every time)\s+(?:do|use|avoid|remember)/i,
  ];

  if (contextPatterns.some(pattern => pattern.test(trimmed))) {
    const isDuplicate = existingMemories.some(
      mem => mem.category === 'context' && calculateSimilarity(mem.content, trimmed) > 0.7,
    );

    if (!isDuplicate) {
      memories.push({
        content: trimmed,
        category: 'context',
        importance: 'high',
        confidence: 'high',
        timestamp: Date.now(),
      });
    }
  }

  // Additional heuristic: Long, detailed prompts might contain important context
  if (trimmed.length > 200 && memories.length === 0) {
    // Check for question words - if it's mostly questions, don't save
    const questionWords = (trimmed.match(/\b(what|when|where|who|why|how|can|could|would|should)\b/gi) || []).length;
    const wordCount = trimmed.split(/\s+/).length;

    if (questionWords / wordCount < 0.1) {
      // Less than 10% question words - might be important context
      const isDuplicate = existingMemories.some(mem => calculateSimilarity(mem.content, trimmed) > 0.8);

      if (!isDuplicate) {
        memories.push({
          content: trimmed,
          category: 'context',
          importance: 'medium',
          confidence: 'medium',
          timestamp: Date.now(),
        });
      }
    }
  }

  return {
    shouldSave: memories.length > 0,
    memories,
    reasoning:
      memories.length > 0 ? `Extracted ${memories.length} important memories` : 'No important information detected',
  };
}

/**
 * Simple similarity calculation using Jaccard similarity on word sets
 * Returns a value between 0 (completely different) and 1 (identical)
 */
function calculateSimilarity(text1: string, text2: string): number {
  const words1 = new Set(
    text1
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2),
  );
  const words2 = new Set(
    text2
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2),
  );

  const intersection = new Set([...words1].filter(w => words2.has(w)));
  const union = new Set([...words1, ...words2]);

  return union.size === 0 ? 0 : intersection.size / union.size;
}

/**
 * Checks if a new memory is a duplicate or update of an existing memory
 */
export function findSimilarMemory(
  newMemory: ExtractedMemory,
  existingMemories: ExtractedMemory[],
  threshold = 0.7,
): ExtractedMemory | null {
  for (const existing of existingMemories) {
    if (existing.category === newMemory.category) {
      const similarity = calculateSimilarity(existing.content, newMemory.content);
      if (similarity > threshold) {
        return existing;
      }
    }
  }
  return null;
}

/**
 * Merges or updates memories, preferring newer, more detailed information
 */
export function mergeMemories(existing: ExtractedMemory, newMemory: ExtractedMemory): ExtractedMemory {
  // If new memory is longer and more detailed, use it
  if (newMemory.content.length > existing.content.length * 1.2) {
    return {
      ...newMemory,
      timestamp: Date.now(),
    };
  }

  // Otherwise keep existing but update timestamp
  return {
    ...existing,
    timestamp: Date.now(),
  };
}
