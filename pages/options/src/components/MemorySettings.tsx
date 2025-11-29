import { useEffect, useState, useCallback } from 'react';
import { llmProviderStore, ProviderTypeEnum } from '@extension/storage';
import { FiPlus, FiTrash2 } from 'react-icons/fi';
import type { MemoryWithEmbedding } from '../../../side-panel/src/services/embeddingService';
import { generateMemoryEmbeddings } from '../../../side-panel/src/services/embeddingService';
import { extractMemoriesFromPrompt, type ExtractedMemory } from '../../../side-panel/src/services/memoryExtractor';

interface MemorySettingsProps {
  isDarkMode?: boolean;
}

export const MemorySettings = ({ isDarkMode = false }: MemorySettingsProps) => {
  const [memories, setMemories] = useState<MemoryWithEmbedding[]>([]);
  const [showAddMemory, setShowAddMemory] = useState(false);
  const [newMemoryText, setNewMemoryText] = useState('');
  const [embeddingApiKey, setEmbeddingApiKey] = useState<string>('');

  // Load memories
  useEffect(() => {
    const loadMemories = async () => {
      try {
        const res = await chrome.storage.local.get(['verse_memories']);
        const storedMemories: MemoryWithEmbedding[] = Array.isArray(res.verse_memories) ? res.verse_memories : [];
        setMemories(storedMemories.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)));
      } catch (error) {
        console.error('Failed to load memories:', error);
      }
    };
    loadMemories();
  }, []);

  // Load embedding API key
  useEffect(() => {
    const loadEmbeddingKey = async () => {
      const allProviders = await llmProviderStore.getAllProviders();
      const openAIProvider = Object.values(allProviders).find(p => p.type === ProviderTypeEnum.OpenAI);
      if (openAIProvider?.apiKey) {
        setEmbeddingApiKey(openAIProvider.apiKey);
      }
    };
    loadEmbeddingKey();
  }, []);

  const deleteLocalMemory = useCallback(async (timestamp: number) => {
    try {
      const res = await chrome.storage.local.get(['verse_memories']);
      const existing: MemoryWithEmbedding[] = Array.isArray(res.verse_memories) ? res.verse_memories : [];
      const updated = existing.filter(m => m.timestamp !== timestamp);
      await chrome.storage.local.set({ verse_memories: updated });
      setMemories(updated.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)));
    } catch (error) {
      console.error('Failed to delete memory:', error);
    }
  }, []);

  const addManualMemory = useCallback(async () => {
    const text = newMemoryText.trim();
    if (!text) return;
    try {
      const res = await chrome.storage.local.get(['verse_memories']);
      const existing: MemoryWithEmbedding[] = Array.isArray(res.verse_memories) ? res.verse_memories : [];

      const extractionResult = await extractMemoriesFromPrompt(text, existing);
      let memoriesToAdd: ExtractedMemory[] = [];

      if (extractionResult.shouldSave && extractionResult.memories.length > 0) {
        memoriesToAdd = extractionResult.memories;
      } else {
        const lowerText = text.toLowerCase();
        let subcategory: 'name' | 'email' | 'phone' | 'location' | 'school' | 'company' | undefined;
        let category: 'personal_info' | 'preference' | 'fact' | 'skill' | 'context' | 'goal' = 'fact';

        if (lowerText.includes('name') || /my name is|i am|i'm [A-Z]/.test(text)) {
          subcategory = 'name';
          category = 'personal_info';
        } else if (lowerText.includes('@') || lowerText.includes('email')) {
          subcategory = 'email';
          category = 'personal_info';
        } else if (lowerText.includes('phone') || lowerText.includes('mobile') || lowerText.includes('cell')) {
          subcategory = 'phone';
          category = 'personal_info';
        } else if (
          lowerText.includes('college') ||
          lowerText.includes('university') ||
          lowerText.includes('school') ||
          lowerText.includes('study')
        ) {
          subcategory = 'school';
          category = 'fact';
        } else if (lowerText.includes('work') || lowerText.includes('company') || lowerText.includes('employer')) {
          subcategory = 'company';
          category = 'fact';
        } else if (lowerText.includes('live') || lowerText.includes('city') || lowerText.includes('location')) {
          subcategory = 'location';
          category = 'personal_info';
        }

        memoriesToAdd = [
          {
            content: text,
            category,
            subcategory,
            importance: 'high',
            confidence: 'high',
            timestamp: Date.now(),
          },
        ];
      }

      const updated = [...memoriesToAdd, ...existing].slice(0, 200);

      let apiKey = embeddingApiKey;
      if (!apiKey) {
        const allProviders = await llmProviderStore.getAllProviders();
        const openAIProvider = Object.values(allProviders).find(p => p.type === ProviderTypeEnum.OpenAI);
        if (openAIProvider?.apiKey) {
          apiKey = openAIProvider.apiKey;
        }
      }

      const withEmbeddings = await generateMemoryEmbeddings(updated, apiKey);
      await chrome.storage.local.set({ verse_memories: withEmbeddings });
      setMemories(withEmbeddings.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)));
      setNewMemoryText('');
      setShowAddMemory(false);
    } catch (e) {
      console.error('Failed to add manual memory', e);
    }
  }, [newMemoryText, embeddingApiKey]);

  return (
    <section className="space-y-6">
      {/* Memories Section */}
      <div className="rounded-2xl p-6 text-left shadow-sm w-full" style={{ backgroundColor: '#343434' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className={`text-left text-xl font-semibold ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
            Memories
          </h2>
          <button
            onClick={() => setShowAddMemory(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white border border-white/40 hover:bg-white/5 transition-colors">
            <FiPlus size={16} />
            <span className="text-sm">Add Memory</span>
          </button>
        </div>

        {memories.length === 0 ? (
          <div className="text-center py-8 text-gray-400">No memories saved yet. Click "Add Memory" to create one.</div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {memories.map((m, idx) => (
              <div key={idx} className="p-4 rounded-lg border border-white/40 hover:border-white/60 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-sm text-white whitespace-pre-wrap break-words">{m.content}</p>
                    {m.subcategory && (
                      <span className="inline-block mt-2 px-2 py-1 text-xs rounded border border-white/40 text-gray-300">
                        {m.subcategory}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => deleteLocalMemory(m.timestamp)}
                    className="flex-shrink-0 p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
                    aria-label="Delete memory"
                    title="Delete">
                    <FiTrash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Memory Modal */}
        {showAddMemory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-lg p-6 shadow-2xl" style={{ backgroundColor: '#2b2b2b' }}>
              <h3 className="text-lg font-semibold text-white mb-4">Add New Memory</h3>
              <textarea
                value={newMemoryText}
                onChange={e => setNewMemoryText(e.target.value)}
                className="w-full h-32 rounded-lg p-3 text-sm bg-transparent text-white placeholder-gray-500 outline-none border border-white/40 focus:border-white/60 transition-colors resize-none"
                placeholder="Type something to remember... (e.g., My name is John, I study at MIT)"
                autoFocus
              />
              <div className="mt-4 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowAddMemory(false);
                    setNewMemoryText('');
                  }}
                  className="px-4 py-2 text-sm rounded-lg border border-white/40 text-gray-300 hover:bg-white/5 transition-colors">
                  Cancel
                </button>
                <button
                  onClick={addManualMemory}
                  disabled={!newMemoryText.trim()}
                  className="px-4 py-2 text-sm rounded-lg bg-transparent border border-white/40 text-white hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                  Save Memory
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
