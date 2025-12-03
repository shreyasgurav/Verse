import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { llmProviderStore, ProviderTypeEnum } from '@extension/storage';
import { FiPlus, FiTrash2 } from 'react-icons/fi';
import type { MemoryWithEmbedding } from '../../../side-panel/src/services/embeddingService';
import { generateMemoryEmbeddings } from '../../../side-panel/src/services/embeddingService';
import { extractMemoriesFromPrompt } from '../../../side-panel/src/services/memoryExtractor';

interface MemorySettingsProps {
  isDarkMode?: boolean;
}

export const MemorySettings = ({ isDarkMode = false }: MemorySettingsProps) => {
  const [memories, setMemories] = useState<MemoryWithEmbedding[]>([]);
  const [showAddMemory, setShowAddMemory] = useState(false);
  const [newMemoryText, setNewMemoryText] = useState('');
  const [embeddingApiKey, setEmbeddingApiKey] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [hasApiKeyConfigured, setHasApiKeyConfigured] = useState<boolean>(false);

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

  // Check if any provider has an API key configured to allow adding memories
  useEffect(() => {
    const checkProviders = async () => {
      try {
        const allProviders = await llmProviderStore.getAllProviders();
        const hasAny = Object.values(allProviders).some(cfg => Boolean(cfg?.apiKey?.trim()));
        setHasApiKeyConfigured(hasAny);
      } catch (e) {
        console.warn('Unable to check provider configuration', e);
        setHasApiKeyConfigured(false);
      }
    };
    checkProviders();
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
      setIsSaving(true);
      const res = await chrome.storage.local.get(['verse_memories']);
      const existing: MemoryWithEmbedding[] = Array.isArray(res.verse_memories) ? res.verse_memories : [];

      // Extract memories from the text (splits paragraphs into separate memories)
      const extractionResult = await extractMemoriesFromPrompt(text, existing);

      if (!extractionResult.shouldSave || extractionResult.memories.length === 0) {
        console.log('No memories extracted from input');
        alert(
          'Could not extract any memories. Try using phrases like "My name is...", "I live in...", "I work at...", etc.',
        );
        setIsSaving(false);
        return;
      }

      console.log(`Extracted ${extractionResult.memories.length} memories from input`);
      const updated = [...extractionResult.memories, ...existing].slice(0, 200);

      // Generate embeddings using internal API key
      const withEmbeddings = await generateMemoryEmbeddings(updated);
      await chrome.storage.local.set({ verse_memories: withEmbeddings });
      setMemories(withEmbeddings.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)));
      setNewMemoryText('');
      setShowAddMemory(false);
    } catch (e) {
      console.error('Failed to add manual memory', e);
    } finally {
      setIsSaving(false);
    }
  }, [newMemoryText, embeddingApiKey]);

  return (
    <section className="flex flex-col h-full w-full">
      {/* Header - Fixed at top */}
      <div className="flex-shrink-0 w-full">
        <div className="flex items-center justify-between mb-2">
          <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>Memories</h2>
          <button
            onClick={() => setShowAddMemory(true)}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
              isDarkMode
                ? 'text-gray-300 hover:bg-white/10 hover:text-white'
                : 'text-gray-600 hover:bg-black/5 hover:text-black'
            } ${!hasApiKeyConfigured ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={!hasApiKeyConfigured}
            title={hasApiKeyConfigured ? 'Add a new memory' : 'Configure an API key first in Models tab'}>
            <FiPlus size={16} />
            <span>Add Memory</span>
          </button>
        </div>
        {!hasApiKeyConfigured && (
          <p className={`mb-4 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Configure a provider API key in the Models tab to add memories.
          </p>
        )}
      </div>

      {/* Memories List - Scrollable */}
      <div className="flex-1 overflow-hidden">
        {memories.length === 0 ? (
          <div className={`text-center py-8 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            No memories saved yet. Click "Add Memory" to create one.
          </div>
        ) : (
          <div className="space-y-1 text-left h-full overflow-y-auto pr-1">
            {memories.map((m, idx) => (
              <div
                key={idx}
                className={`group flex items-start justify-between gap-3 p-2 rounded-lg transition-colors w-full ${
                  isDarkMode ? 'hover:bg-white/5' : 'hover:bg-black/5'
                }`}>
                <p
                  className={`text-sm whitespace-pre-wrap break-words flex-1 text-left ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                  {m.content}
                </p>
                <button
                  onClick={() => deleteLocalMemory(m.timestamp)}
                  className="opacity-0 group-hover:opacity-100 flex-shrink-0 p-1.5 text-red-400 hover:text-red-300 rounded transition-all"
                  aria-label="Delete memory"
                  title="Delete">
                  <FiTrash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Memory Modal */}
      {showAddMemory &&
        createPortal(
          <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-[2px]">
            <div className="w-full max-w-lg rounded-3xl p-6 shadow-2xl" style={{ backgroundColor: '#2b2b2b' }}>
              <h3 className="text-lg font-semibold text-white mb-4 text-left">Add New Memory</h3>
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
                  disabled={!newMemoryText.trim() || isSaving}
                  aria-busy={isSaving}
                  className="px-4 py-2 text-sm rounded-lg bg-transparent border border-white/40 text-white hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-2">
                  {isSaving && (
                    <span className="inline-block w-3 h-3 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  )}
                  {isSaving ? 'Saving…' : 'Save Memory'}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </section>
  );
};
