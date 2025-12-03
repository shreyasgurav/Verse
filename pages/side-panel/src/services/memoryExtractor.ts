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
 * Split text into sentences for granular extraction
 */
function splitIntoSentences(text: string): string[] {
  // Split by common sentence endings, newlines, or bullet points
  const sentences = text
    .split(/(?<=[.!?])\s+|[\n\r]+|(?:^|\s)[-•*]\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 10); // Filter out very short fragments

  return sentences.length > 0 ? sentences : [text.trim()];
}

/**
 * Generate unique timestamp for each memory
 */
let timestampCounter = 0;
function getUniqueTimestamp(): number {
  timestampCounter++;
  return Date.now() + timestampCounter;
}

/**
 * Extract memory from a single sentence/statement
 */
function extractFromSentence(
  sentence: string,
  existingMemories: ExtractedMemory[],
  allExtracted: ExtractedMemory[],
): ExtractedMemory[] {
  const memories: ExtractedMemory[] = [];
  const trimmed = sentence.trim();

  if (!trimmed || trimmed.length < 10) return memories;

  // Check if this exact content was already extracted in this batch
  const alreadyExtracted = allExtracted.some(m => calculateSimilarity(m.content, trimmed) > 0.85);
  if (alreadyExtracted) return memories;

  // Pattern: Name - more flexible to catch "I am John Doe, a developer"
  const nameMatch = trimmed.match(
    /(?:my\s+name\s+is|i\s+am|i'm|call\s+me)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)(?:[,.\s]|$)/i,
  );
  if (nameMatch && nameMatch[1]) {
    const name = nameMatch[1].trim();
    const content = `User's name is ${name}`;
    if (!isDuplicate(content, 'name', existingMemories, allExtracted)) {
      memories.push({
        content,
        category: 'personal_info',
        subcategory: 'name',
        importance: 'high',
        confidence: 'high',
        timestamp: getUniqueTimestamp(),
      });
    }
  }

  // Pattern: Email
  const emailMatch = trimmed.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
  if (emailMatch && emailMatch[1]) {
    const content = `User's email is ${emailMatch[1]}`;
    if (!isDuplicate(content, 'email', existingMemories, allExtracted)) {
      memories.push({
        content,
        category: 'personal_info',
        subcategory: 'email',
        importance: 'high',
        confidence: 'high',
        timestamp: getUniqueTimestamp(),
      });
    }
  }

  // Pattern: Phone
  const phoneMatch = trimmed.match(/(?:phone|mobile|cell|number)(?:\s+is)?\s*:?\s*([+\d\s()-]{10,})/i);
  if (phoneMatch && phoneMatch[1]) {
    const content = `User's phone number is ${phoneMatch[1].trim()}`;
    if (!isDuplicate(content, 'phone', existingMemories, allExtracted)) {
      memories.push({
        content,
        category: 'personal_info',
        subcategory: 'phone',
        importance: 'high',
        confidence: 'high',
        timestamp: getUniqueTimestamp(),
      });
    }
  }

  // Pattern: Location/City/Hometown
  const locationMatch = trimmed.match(
    /(?:i\s+live\s+in|i'm\s+from|i\s+am\s+from|my\s+(?:city|hometown|location)\s+is|from)\s+([A-Z][A-Za-z\s,]+?)(?:\.|,|$)/i,
  );
  if (locationMatch && locationMatch[1]) {
    const location = locationMatch[1].trim().replace(/[.,]$/, '');
    const content = `User is from ${location}`;
    if (!isDuplicate(content, 'location', existingMemories, allExtracted)) {
      memories.push({
        content,
        category: 'personal_info',
        subcategory: 'location',
        importance: 'high',
        confidence: 'high',
        timestamp: getUniqueTimestamp(),
      });
    }
  }

  // Pattern: College/University/School
  const collegeMatch = trimmed.match(
    /(?:i\s+(?:study|studied|attend|attended|go\s+to|went\s+to|am\s+at|was\s+at|graduated\s+from)|my\s+(?:college|university|school)\s+is)\s+(?:at\s+)?([A-Z][A-Za-z\s&]+?)(?:\.|,|$)/i,
  );
  if (collegeMatch && collegeMatch[1]) {
    const college = collegeMatch[1].trim().replace(/[.,]$/, '');
    const content = `User studies at ${college}`;
    if (!isDuplicate(content, 'school', existingMemories, allExtracted)) {
      memories.push({
        content,
        category: 'fact',
        subcategory: 'school',
        importance: 'high',
        confidence: 'high',
        timestamp: getUniqueTimestamp(),
      });
    }
  }

  // Pattern: Company/Work
  const companyMatch = trimmed.match(
    /(?:i\s+work\s+at|working\s+at|employed\s+at|my\s+company\s+is)\s+([A-Z][A-Za-z\s&]+?)(?:\.|,|$)/i,
  );
  if (companyMatch && companyMatch[1]) {
    const company = companyMatch[1].trim().replace(/[.,]$/, '');
    const content = `User works at ${company}`;
    if (!isDuplicate(content, 'company', existingMemories, allExtracted)) {
      memories.push({
        content,
        category: 'fact',
        subcategory: 'company',
        importance: 'high',
        confidence: 'high',
        timestamp: getUniqueTimestamp(),
      });
    }
  }

  // Pattern: Preferences (favorite, like, prefer)
  const prefMatch = trimmed.match(/(?:my\s+favorite|i\s+(?:like|love|prefer|enjoy))\s+(.+?)(?:\.|,|$)/i);
  if (prefMatch && prefMatch[1]) {
    const pref = prefMatch[1].trim().replace(/[.,]$/, '');
    const content = `User likes ${pref}`;
    if (!isDuplicate(content, 'preference_specific', existingMemories, allExtracted)) {
      memories.push({
        content,
        category: 'preference',
        subcategory: 'preference_specific',
        importance: 'high',
        confidence: 'high',
        timestamp: getUniqueTimestamp(),
      });
    }
  }

  // Pattern: Age
  const ageMatch = trimmed.match(/(?:i\s+am|i'm)\s+(\d{1,3})\s*(?:years?\s*old)?/i);
  if (ageMatch && ageMatch[1]) {
    const age = ageMatch[1];
    const content = `User is ${age} years old`;
    if (!isDuplicate(content, 'age', existingMemories, allExtracted)) {
      memories.push({
        content,
        category: 'personal_info',
        subcategory: 'age',
        importance: 'high',
        confidence: 'high',
        timestamp: getUniqueTimestamp(),
      });
    }
  }

  // Pattern: Birthday
  const bdayMatch = trimmed.match(/(?:my\s+birthday\s+is|born\s+on)\s+(.+?)(?:\.|,|$)/i);
  if (bdayMatch && bdayMatch[1]) {
    const bday = bdayMatch[1].trim().replace(/[.,]$/, '');
    const content = `User's birthday is ${bday}`;
    if (!isDuplicate(content, 'birthday', existingMemories, allExtracted)) {
      memories.push({
        content,
        category: 'personal_info',
        subcategory: 'birthday',
        importance: 'high',
        confidence: 'high',
        timestamp: getUniqueTimestamp(),
      });
    }
  }

  // Pattern: Skills
  const skillMatch = trimmed.match(
    /(?:i\s+know|i\s+can|i'm\s+good\s+at|skilled\s+in|proficient\s+in)\s+(.+?)(?:\.|,|$)/i,
  );
  if (skillMatch && skillMatch[1]) {
    const skill = skillMatch[1].trim().replace(/[.,]$/, '');
    const content = `User knows ${skill}`;
    if (!isDuplicate(content, 'skill_specific', existingMemories, allExtracted)) {
      memories.push({
        content,
        category: 'skill',
        subcategory: 'skill_specific',
        importance: 'medium',
        confidence: 'high',
        timestamp: getUniqueTimestamp(),
      });
    }
  }

  // Pattern: Goals
  const goalMatch = trimmed.match(
    /(?:i\s+want\s+to|my\s+goal\s+is|i'm\s+trying\s+to|i\s+plan\s+to)\s+(.+?)(?:\.|,|$)/i,
  );
  if (goalMatch && goalMatch[1]) {
    const goal = goalMatch[1].trim().replace(/[.,]$/, '');
    const content = `User wants to ${goal}`;
    if (!isDuplicate(content, 'general', existingMemories, allExtracted)) {
      memories.push({
        content,
        category: 'goal',
        importance: 'high',
        confidence: 'high',
        timestamp: getUniqueTimestamp(),
      });
    }
  }

  // Pattern: Hobby
  const hobbyMatch = trimmed.match(/(?:my\s+hobby\s+is|i\s+enjoy|in\s+my\s+free\s+time)\s+(.+?)(?:\.|,|$)/i);
  if (hobbyMatch && hobbyMatch[1]) {
    const hobby = hobbyMatch[1].trim().replace(/[.,]$/, '');
    const content = `User's hobby is ${hobby}`;
    if (!isDuplicate(content, 'hobby', existingMemories, allExtracted)) {
      memories.push({
        content,
        category: 'preference',
        subcategory: 'hobby',
        importance: 'medium',
        confidence: 'high',
        timestamp: getUniqueTimestamp(),
      });
    }
  }

  // Pattern: Professional role/title - "I am a developer", "a developer who builds"
  const roleMatch = trimmed.match(
    /(?:i\s+am\s+a|i'm\s+a|i\s+work\s+as\s+a?)\s+([a-z]+(?:\s+[a-z]+)?)\s+(?:who|that|and|building|creating|working)/i,
  );
  if (roleMatch && roleMatch[1]) {
    const role = roleMatch[1].trim();
    const content = `User is a ${role}`;
    if (!isDuplicate(content, 'employment', existingMemories, allExtracted)) {
      memories.push({
        content,
        category: 'fact',
        subcategory: 'employment',
        importance: 'high',
        confidence: 'high',
        timestamp: getUniqueTimestamp(),
      });
    }
  }

  // Pattern: Core skills - "My core skills include X, Y, Z" or "skills include"
  const skillsMatch = trimmed.match(/(?:my\s+)?(?:core\s+)?skills\s+include\s+(.+?)(?:\.|$)/i);
  if (skillsMatch && skillsMatch[1]) {
    const skills = skillsMatch[1].trim().replace(/[.,]$/, '');
    const content = `User's skills: ${skills}`;
    if (!isDuplicate(content, 'skill_specific', existingMemories, allExtracted)) {
      memories.push({
        content,
        category: 'skill',
        subcategory: 'skill_specific',
        importance: 'high',
        confidence: 'high',
        timestamp: getUniqueTimestamp(),
      });
    }
  }

  // Pattern: Project - "X is a/an Y built using Z"
  const projectMatch = trimmed.match(/^([A-Z][a-zA-Z]*)\s+is\s+(?:a|an)\s+(.+?)(?:built|using|that|which)/i);
  if (projectMatch && projectMatch[1] && projectMatch[2]) {
    const projectName = projectMatch[1].trim();
    const projectDesc = projectMatch[2].trim().replace(/[.,]$/, '');
    const content = `User built ${projectName}: ${projectDesc}`;
    if (!isDuplicate(content, 'general', existingMemories, allExtracted)) {
      memories.push({
        content,
        category: 'fact',
        importance: 'high',
        confidence: 'high',
        timestamp: getUniqueTimestamp(),
      });
    }
  }

  // Pattern: Work style - "I work fast", "My focus is"
  const workStyleMatch = trimmed.match(/(?:i\s+work\s+|my\s+focus\s+is\s+)(.+?)(?:\.|,|$)/i);
  if (workStyleMatch && workStyleMatch[1] && !workStyleMatch[1].toLowerCase().includes('at ')) {
    const style = workStyleMatch[1].trim().replace(/[.,]$/, '');
    if (style.length > 3 && style.length < 100) {
      const content = `User's work style: ${style}`;
      if (!isDuplicate(content, 'general', existingMemories, allExtracted)) {
        memories.push({
          content,
          category: 'preference',
          importance: 'medium',
          confidence: 'high',
          timestamp: getUniqueTimestamp(),
        });
      }
    }
  }

  // Pattern: Website/URL - "my website is X", "my portfolio is X"
  const websiteMatch = trimmed.match(
    /(?:my\s+)?(?:website|portfolio|site|blog|github|linkedin|twitter|url)\s+(?:is|:)?\s*(https?:\/\/)?([a-zA-Z0-9][-a-zA-Z0-9]*(?:\.[a-zA-Z0-9][-a-zA-Z0-9]*)+(?:\/\S*)?)/i,
  );
  if (websiteMatch && websiteMatch[2]) {
    const url = websiteMatch[1] ? websiteMatch[1] + websiteMatch[2] : websiteMatch[2];
    const content = `User's website is ${url}`;
    if (!isDuplicate(content, 'general', existingMemories, allExtracted)) {
      memories.push({
        content,
        category: 'personal_info',
        importance: 'high',
        confidence: 'high',
        timestamp: getUniqueTimestamp(),
      });
    }
  }

  // Pattern: Generic "my X is Y" - catches things like "my favorite color is blue", "my dog's name is Max"
  const myIsMatch = trimmed.match(/^my\s+([a-z]+(?:\s+[a-z]+)?(?:'s)?(?:\s+[a-z]+)?)\s+is\s+(.+?)(?:\.|,|$)/i);
  if (myIsMatch && myIsMatch[1] && myIsMatch[2] && memories.length === 0) {
    const thing = myIsMatch[1].trim();
    const value = myIsMatch[2].trim().replace(/[.,]$/, '');
    // Skip if it's already matched by other patterns (name, email, etc.)
    if (value.length > 1 && value.length < 100) {
      const content = `User's ${thing} is ${value}`;
      if (!isDuplicate(content, 'general', existingMemories, allExtracted)) {
        memories.push({
          content,
          category: 'fact',
          importance: 'medium',
          confidence: 'high',
          timestamp: getUniqueTimestamp(),
        });
      }
    }
  }

  // Pattern: "X is my Y" - catches "Sarah is my girlfriend", "Max is my dog", "React is my favorite framework"
  const isMyMatch = trimmed.match(/^([A-Z][a-zA-Z]*(?:\s+[A-Z]?[a-zA-Z]*)?)\s+is\s+my\s+(.+?)(?:\.|,|$)/i);
  if (isMyMatch && isMyMatch[1] && isMyMatch[2] && memories.length === 0) {
    const name = isMyMatch[1].trim();
    const relation = isMyMatch[2].trim().replace(/[.,]$/, '');
    if (relation.length > 1 && relation.length < 50) {
      const content = `${name} is user's ${relation}`;
      if (!isDuplicate(content, 'general', existingMemories, allExtracted)) {
        memories.push({
          content,
          category: 'fact',
          importance: 'high',
          confidence: 'high',
          timestamp: getUniqueTimestamp(),
        });
      }
    }
  }

  // Pattern: "I have a X named Y" - catches "I have a dog named Max", "I have a sister named Sarah"
  const haveNamedMatch = trimmed.match(
    /i\s+have\s+(?:a|an)\s+([a-z]+(?:\s+[a-z]+)?)\s+(?:named|called)\s+([A-Z][a-zA-Z]*)/i,
  );
  if (haveNamedMatch && haveNamedMatch[1] && haveNamedMatch[2]) {
    const thing = haveNamedMatch[1].trim();
    const name = haveNamedMatch[2].trim();
    const content = `User has a ${thing} named ${name}`;
    if (!isDuplicate(content, 'general', existingMemories, allExtracted)) {
      memories.push({
        content,
        category: 'fact',
        importance: 'high',
        confidence: 'high',
        timestamp: getUniqueTimestamp(),
      });
    }
  }

  // SMART FALLBACK: Detect if sentence contains personal/important information signals
  if (memories.length === 0) {
    const isImportantMemory = detectImportantMemory(trimmed);
    if (isImportantMemory) {
      const content = trimmed.length > 200 ? trimmed.substring(0, 200) + '...' : trimmed;
      if (!isDuplicate(content, 'general', existingMemories, allExtracted)) {
        memories.push({
          content,
          category: 'context',
          importance: 'medium',
          confidence: 'medium',
          timestamp: getUniqueTimestamp(),
        });
      }
    }
  }

  return memories;
}

/**
 * Smart detection of important memories using semantic signals
 * Instead of rigid patterns, we look for signals that indicate personal/important info
 */
function detectImportantMemory(text: string): boolean {
  const lower = text.toLowerCase();

  // Signal 1: Contains possessive pronouns (my, mine, our)
  const hasPossessive = /\b(my|mine|our)\b/.test(lower);

  // Signal 2: Contains personal pronouns with verbs (I am, I have, I work, etc.)
  const hasPersonalStatement =
    /\bi\s+(am|have|had|was|were|work|live|study|love|like|prefer|want|need|use|know|can|will|would)\b/.test(lower);

  // Signal 3: Contains relationship words
  const hasRelationship =
    /\b(girlfriend|boyfriend|wife|husband|partner|friend|brother|sister|mother|father|mom|dad|son|daughter|family|pet|dog|cat)\b/.test(
      lower,
    );

  // Signal 4: Contains identity/role words
  const hasIdentity =
    /\b(name|age|birthday|born|live|from|work|job|company|school|college|university|degree|major|skill|hobby|favorite|prefer)\b/.test(
      lower,
    );

  // Signal 5: Contains "is my" or "is our" pattern anywhere
  const hasIsMyPattern = /\bis\s+(my|our)\b/.test(lower);

  // Signal 6: Contains contact info patterns
  const hasContactInfo = /\b(email|phone|number|address|website|portfolio|linkedin|github|twitter)\b/.test(lower);

  // Signal 7: Declarative statement with proper noun (capitalized word that's not at start)
  const hasProperNoun = /\s[A-Z][a-z]+/.test(text);

  // Signal 8: Contains "remember" or explicit memory request
  const hasRememberRequest = /\b(remember|don't forget|note that|keep in mind|important)\b/.test(lower);

  // Calculate importance score
  let score = 0;
  if (hasPossessive) score += 2;
  if (hasPersonalStatement) score += 2;
  if (hasRelationship) score += 3;
  if (hasIdentity) score += 2;
  if (hasIsMyPattern) score += 3;
  if (hasContactInfo) score += 2;
  if (hasProperNoun) score += 1;
  if (hasRememberRequest) score += 3;

  // Minimum length check (at least 15 chars for meaningful content)
  if (text.length < 15) return false;

  // If score >= 2, consider it important enough to save
  return score >= 2;
}

/**
 * Check if memory is duplicate (exact match or high similarity)
 */
function isDuplicate(
  content: string,
  subcategory: string | undefined,
  existingMemories: ExtractedMemory[],
  allExtracted: ExtractedMemory[],
): boolean {
  const allMemories = [...existingMemories, ...allExtracted];
  const normalizedContent = content.toLowerCase().trim();

  return allMemories.some(m => {
    const normalizedExisting = m.content.toLowerCase().trim();

    // Exact match check (case-insensitive)
    if (normalizedContent === normalizedExisting) {
      return true;
    }

    // Check if one contains the other (substring match)
    if (normalizedContent.includes(normalizedExisting) || normalizedExisting.includes(normalizedContent)) {
      return true;
    }

    // Similarity check - stricter thresholds
    if (subcategory && m.subcategory === subcategory) {
      return calculateSimilarity(m.content, content) > 0.6; // Stricter for same subcategory
    }
    return calculateSimilarity(m.content, content) > 0.75; // Stricter general threshold
  });
}

/**
 * Analyzes a user prompt to extract important, memorable information
 * Splits paragraphs into sentences and extracts from each for granular memories
 */
export async function extractMemoriesFromPrompt(
  prompt: string,
  existingMemories: ExtractedMemory[] = [],
): Promise<MemoryExtractionResult> {
  const trimmed = prompt.trim();

  // Skip empty or very short prompts
  if (!trimmed || trimmed.length < 5) {
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

  // Split into sentences and extract from each
  const sentences = splitIntoSentences(trimmed);
  const memories: ExtractedMemory[] = [];

  for (const sentence of sentences) {
    const extracted = extractFromSentence(sentence, existingMemories, memories);
    memories.push(...extracted);
  }

  // Return extracted memories
  return {
    shouldSave: memories.length > 0,
    memories,
    reasoning:
      memories.length > 0
        ? `Extracted ${memories.length} memories from ${sentences.length} sentences`
        : 'No important information detected',
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
      timestamp: getUniqueTimestamp(),
    };
  }

  // Otherwise keep existing but update timestamp
  return {
    ...existing,
    timestamp: getUniqueTimestamp(),
  };
}
