/**
 * Memory System Types
 * Based on Supermemory architecture analysis
 */

export type MemoryCategory = 'personal_info' | 'preference' | 'fact' | 'skill' | 'context' | 'goal';

export type MemorySubcategory =
  // Personal Info
  | 'name'
  | 'email'
  | 'phone'
  | 'location'
  | 'age'
  | 'birthday'
  // Employment
  | 'employment'
  | 'job_title'
  | 'company'
  // Education
  | 'education'
  | 'degree'
  | 'school'
  // Other
  | 'hobby'
  | 'skill_specific'
  | 'preference_specific'
  | 'general';

export type MemorySource = 'user_prompt' | 'form_fill' | 'chat_response' | 'manual' | 'extracted';

export type MemoryConfidence = 'high' | 'medium' | 'low';

export interface MemoryEntry {
  id: string;
  content: string;
  category: MemoryCategory;
  subcategory?: MemorySubcategory;
  confidence: MemoryConfidence;
  source: MemorySource;
  embedding: number[];
  metadata: {
    platform?: string;
    url?: string;
    timestamp: number;
    userVerified?: boolean;
    extractedFrom?: string;
  };
  version: number;
  parentId?: string; // For versioning
  containerTags: string[]; // For isolation
  relevanceScore?: number; // When retrieved
}

export interface MemoryDocument {
  id: string;
  rawContent: string;
  memoryEntries: string[]; // IDs of extracted memories
  metadata: Record<string, any>;
  status: 'pending' | 'processing' | 'done' | 'error';
  createdAt: number;
  updatedAt: number;
}

export interface RetrievalOptions {
  query: string;
  apiKey?: string;
  topK?: number;
  minSimilarity?: number;
  categories?: MemoryCategory[];
  subcategories?: MemorySubcategory[];
  containerTags?: string[];
  includeRelated?: boolean;
}

export interface ExtractionResult {
  shouldSave: boolean;
  memories: MemoryEntry[];
  reasoning?: string;
}
