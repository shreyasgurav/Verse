/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback, useRef } from 'react';
import { FiSettings } from 'react-icons/fi';
import { type Message, Actors, chatHistoryStore, agentModelStore, generalSettingsStore, type ThinkingStep, llmProviderStore, type ProviderConfig, llmProviderModelNames, ProviderTypeEnum, AgentNameEnum, getDefaultAgentModelParams, type ChatHistoryStorage } from '@extension/storage';
import favoritesStorage, { type FavoritePrompt } from '@extension/storage/lib/prompt/favorites';
import { t } from '@extension/i18n';
import MessageList from './components/MessageList';
import ChatInput from './components/ChatInput';
import ChatHistoryList from './components/ChatHistoryList';
import BookmarkList from './components/BookmarkList';
import { EventType, type AgentEvent, ExecutionState } from './types/event';
import './SidePanel.css';

// Declare chrome API types
declare global {
  interface Window {
    chrome: typeof chrome;
  }
}

// Helper functions for event classification
const isThinkingEvent = (actor: Actors, state: ExecutionState): boolean => {
  // Only show actual reasoning steps as thinking, not simple responses
  // Planner reasoning
  if (actor === Actors.PLANNER && state === ExecutionState.STEP_OK) {
    return true; // "1. Navigate to Instagram..."
  }
  
  // Navigator actions - only show as thinking if it's actual reasoning, not simple responses
  if (actor === Actors.NAVIGATOR && state === ExecutionState.ACT_START) {
    return true; // "Navigate to Instagram homepage..."
  }
  
  // Validator checks
  if (actor === Actors.VALIDATOR && state === ExecutionState.STEP_OK) {
    return true;
  }
  
  // Errors during execution
  if (state === ExecutionState.STEP_FAIL || state === ExecutionState.ACT_FAIL) {
    return true; // "Tab operation timed out..."
  }
  
  return false;
};

const isFinalEvent = (actor: Actors, state: ExecutionState): boolean => {
  // Only TASK_OK/TASK_FAIL from SYSTEM are truly final
  if (actor === Actors.SYSTEM && 
      [ExecutionState.TASK_OK, ExecutionState.TASK_FAIL].includes(state)) {
    return true;
  }
  
  // ACT_OK is NOT final - it's part of thinking!
  // User messages are handled separately in handleSendMessage
  
  return false;
};

// Helper functions for provider configuration
const getDefaultDisplayNameFromProviderId = (providerId: string): string => {
  const displayNames: Record<string, string> = {
    [ProviderTypeEnum.OpenAI]: 'OpenAI',
    [ProviderTypeEnum.Anthropic]: 'Anthropic',
    [ProviderTypeEnum.DeepSeek]: 'DeepSeek',
    [ProviderTypeEnum.Gemini]: 'Google Gemini',
    [ProviderTypeEnum.Grok]: 'Grok',
    [ProviderTypeEnum.Ollama]: 'Ollama',
    [ProviderTypeEnum.AzureOpenAI]: 'Azure OpenAI',
    [ProviderTypeEnum.OpenRouter]: 'OpenRouter',
    [ProviderTypeEnum.Groq]: 'Groq',
    [ProviderTypeEnum.Cerebras]: 'Cerebras',
    [ProviderTypeEnum.Llama]: 'Llama',
    [ProviderTypeEnum.CustomOpenAI]: 'Custom OpenAI',
  };
  return displayNames[providerId] || providerId;
};

const getDefaultProviderConfig = (providerId: string): ProviderConfig => {
  return {
    name: getDefaultDisplayNameFromProviderId(providerId),
    type: providerId as ProviderTypeEnum,
    apiKey: '',
    modelNames: llmProviderModelNames[providerId as keyof typeof llmProviderModelNames] || [],
    createdAt: Date.now(),
  };
};

const SidePanel = () => {
  const progressMessage = 'Showing progress...';
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputEnabled, setInputEnabled] = useState(true);
  const [showStopButton, setShowStopButton] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [chatSessions, setChatSessions] = useState<Array<{ id: string; title: string; createdAt: number }>>([]);
  const [isFollowUpMode, setIsFollowUpMode] = useState(false);
  const [isHistoricalSession, setIsHistoricalSession] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [favoritePrompts, setFavoritePrompts] = useState<FavoritePrompt[]>([]);
  const [hasConfiguredModels, setHasConfiguredModels] = useState<boolean | null>(null); // null = loading, false = no models, true = has models
  const [isReplaying, setIsReplaying] = useState(false);
  const [replayEnabled, setReplayEnabled] = useState(false);
  const [currentThinking, setCurrentThinking] = useState<ThinkingStep[]>([]);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [currentTaskState, setCurrentTaskState] = useState<'idle' | 'starting' | 'thinking' | 'complete'>('idle');
  const currentThinkingRef = useRef<ThinkingStep[]>([]);
  const sessionIdRef = useRef<string | null>(null);
  const isReplayingRef = useRef<boolean>(false);
  const portRef = useRef<chrome.runtime.Port | null>(null);
  const heartbeatIntervalRef = useRef<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const setInputTextRef = useRef<((text: string) => void) | null>(null);
  const taskTimeoutRef = useRef<number | null>(null);
  
  // Tab-specific state
  const [currentTabId, setCurrentTabId] = useState<number | null>(null);
  const tabIdRef = useRef<number | null>(null);
  const [needsConnection, setNeedsConnection] = useState(false);
  
  // Tab-specific chat history store
  const [tabChatHistoryStore, setTabChatHistoryStore] = useState<ChatHistoryStorage | null>(null);
  
  // Store unsent input text per tab (tabId -> text)
  const tabInputTextRef = useRef<Map<number, string>>(new Map());
  
  // Track current input text
  const [currentInputText, setCurrentInputText] = useState<string>('');
  const currentInputTextRef = useRef<string>('');

  // LLM Provider configuration state
  const [singleProvider, setSingleProvider] = useState<string>('');
  const [singleModel, setSingleModel] = useState<string>('');
  const [singleApiKey, setSingleApiKey] = useState<string>('');
  const [providers, setProviders] = useState<Record<string, ProviderConfig>>({});

  // Function to initialize tab context (extracted for reuse)
  const initializeTabContext = useCallback(async (forceTabId?: number) => {
      try {
        let tabId: number | null = forceTabId || null;
        
        // CRITICAL: If forceTabId is provided, use it immediately and set ref SYNCHRONOUSLY
        // This prevents race conditions where reloadCurrentSession runs before tabId is set
        if (forceTabId) {
          console.log('🔒 Using forced tab ID:', forceTabId);
          tabIdRef.current = forceTabId; // Set IMMEDIATELY before any async operations
        }
        
        // CRITICAL: Get the tab ID from the background script via the port connection
        // This is the ONLY reliable way to know which tab this side panel belongs to
        // The port name contains the tab ID: "side-panel-{tabId}"
        
        // Method 1: Extract from existing port connection (if already connected)
        // We'll set this up when we connect to the background script
        
        // Method 2: Try to get from URL search params (passed during side panel setup)
        // This is set by the background script when enabling the side panel
        if (!tabId) {
          const urlParams = new URLSearchParams(window.location.search);
          const urlTabId = urlParams.get('tabId');
          if (urlTabId) {
            tabId = parseInt(urlTabId, 10);
            tabIdRef.current = tabId; // Set IMMEDIATELY
            console.log('Got tab ID from URL params:', tabId);
          }
        }
        
        // Method 3: Fallback - ask background script for current tab
        // This is less reliable but better than not initializing at all
        if (!tabId) {
          try {
            console.error('❌ CRITICAL: URL params missing, using unreliable fallback');
            console.error('This may cause incorrect tab association during fast tab switches');
            console.error('URL:', window.location.href);
            console.trace('Stack trace for debugging:');
            
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tabs[0]?.id) {
              tabId = tabs[0].id;
              tabIdRef.current = tabId; // Set IMMEDIATELY even in fallback
              console.warn('⚠️ Got tab ID from active tab query (fallback):', tabId);
              console.warn('This may be incorrect if user switched tabs quickly');
            }
          } catch (error) {
            console.error('Failed to get tab ID from fallback:', error);
          }
        }
        
        // CRITICAL: If we still don't have a tab ID, we MUST NOT proceed
        if (!tabId) {
          console.error('❌ CRITICAL: Could not determine tab ID! Side panel will not initialize.');
          console.error('URL:', window.location.href);
          console.error('Please report this issue with the above URL.');
          return; // Don't initialize without tab ID
        }
        
        // Double-check: Ensure tab ID is valid
        if (tabId && tabId > 0) {
          console.log('=== Side Panel Initialization ===');
          console.log('Tab ID:', tabId);
          console.log('Window location:', window.location.href);
          
          setCurrentTabId(tabId);
          tabIdRef.current = tabId;
          
          // CRITICAL: Reset all UI states for new tab
          setShowStopButton(false);
          setInputEnabled(true);
          setCurrentTaskState('idle');
          setCurrentThinking([]);
          currentThinkingRef.current = [];
          setCurrentTaskId(null);
          console.log('✅ Reset UI states for tab:', tabId);
          
          // Create tab-specific chat history store
          const { createChatHistoryStorage } = await import('@extension/storage');
          const store = createChatHistoryStorage(tabId);
          setTabChatHistoryStore(store);
          console.log('Created tab-specific storage for tab:', tabId);
          
          // Smart session loading: Load if tab has history, skip if brand new
          try {
            const sessions = await store.getSessionsMetadata();
            console.log('📊 Found', sessions.length, 'existing sessions for tab:', tabId);
            
            if (sessions.length > 0) {
              // This tab has history - load the most recent session
              const sortedSessions = sessions.sort((a, b) => b.createdAt - a.createdAt);
              const latestSession = sortedSessions[0];
              
              console.log('🔄 Loading latest session:', latestSession.id, 'created:', new Date(latestSession.createdAt));
              
              const fullSession = await store.getSession(latestSession.id);
              if (fullSession && fullSession.messages.length > 0) {
                setCurrentSessionId(fullSession.id);
                sessionIdRef.current = fullSession.id;
                setMessages(fullSession.messages);
                setIsFollowUpMode(true);
                console.log('✅ Loaded session with', fullSession.messages.length, 'messages');
              } else {
                console.log('⚠️ Session exists but has no messages, starting fresh');
              }
            } else {
              console.log('✅ No existing sessions, starting fresh (new tab)');
            }
          } catch (error) {
            console.error('Failed to load existing session:', error);
            // Continue anyway - user can start a new session
          }
          
          console.log('=== Initialization Complete ===');
          
          // CRITICAL: Trigger connection setup
          setNeedsConnection(true);
        } else {
          console.error('❌ Failed to determine tab ID!');
        }
      } catch (error) {
        console.error('Failed to initialize tab context:', error);
      }
    }, []);
  
  // Get current tab ID on mount and create tab-specific storage
  useEffect(() => {
    initializeTabContext();
  }, [initializeTabContext]);
  
  // CRITICAL: Detect when URL changes (new tab opened) and reinitialize
  useEffect(() => {
    const checkUrlChange = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const urlTabId = urlParams.get('tabId');
      
      if (urlTabId) {
        const newTabId = parseInt(urlTabId, 10);
        
        // If URL tab ID differs from current tab ID, reinitialize
        if (newTabId !== tabIdRef.current && tabIdRef.current !== null) {
          console.log('🔄 URL tab ID changed!', tabIdRef.current, '→', newTabId);
          console.log('Reinitializing for new tab...');
          
          // Clear current state
          setMessages([]);
          setCurrentSessionId(null);
          sessionIdRef.current = null;
          setIsFollowUpMode(false);
          setIsHistoricalSession(false);
          setShowHistory(false);
          setCurrentThinking([]);
          currentThinkingRef.current = [];
          setCurrentTaskId(null);
          setCurrentTaskState('idle');
          
          // Reinitialize with new tab ID
          initializeTabContext();
        }
      }
    };
    
    // Check on mount and when URL changes
    checkUrlChange();
    
    // Listen for URL changes (popstate event)
    window.addEventListener('popstate', checkUrlChange);
    
    return () => {
      window.removeEventListener('popstate', checkUrlChange);
    };
  }, [initializeTabContext]);

  // Listen for tab activation changes to reset state when switching tabs
  useEffect(() => {
    const handleTabActivated = async (activeInfo: chrome.tabs.TabActiveInfo) => {
      const newTabId = activeInfo.tabId;
      
      // Only reinitialize if the tab actually changed
      if (newTabId !== tabIdRef.current) {
        console.log('=== Tab Switch Detected ===');
        console.log('Previous tab:', tabIdRef.current);
        console.log('New tab:', newTabId);
        
        // Save current input text for the old tab (if exists)
        if (tabIdRef.current !== null && currentInputTextRef.current) {
          tabInputTextRef.current.set(tabIdRef.current, currentInputTextRef.current);
          console.log('Saved input text for tab', tabIdRef.current, ':', currentInputTextRef.current);
        }
        
        // Clear current state
        setMessages([]);
        setCurrentSessionId(null);
        sessionIdRef.current = null;
        setIsFollowUpMode(false);
        setIsHistoricalSession(false);
        setShowHistory(false);
        setCurrentThinking([]);
        currentThinkingRef.current = [];
        setCurrentTaskId(null);
        setCurrentTaskState('idle');
        
        // Reinitialize with new tab
        await initializeTabContext(newTabId);
        
        // Restore input text for the new tab (if exists)
        const savedText = tabInputTextRef.current.get(newTabId) || '';
        if (setInputTextRef.current) {
          setInputTextRef.current(savedText);
          console.log('Restored input text for tab', newTabId, ':', savedText);
        }
        
        console.log('=== Tab Switch Complete ===');
      }
    };
    
    // Add listener
    chrome.tabs.onActivated.addListener(handleTabActivated);
    
    // Cleanup
    return () => {
      chrome.tabs.onActivated.removeListener(handleTabActivated);
    };
  }, [initializeTabContext]);

  // Check for dark mode preference
  useEffect(() => {
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDarkMode(darkModeMediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setIsDarkMode(e.matches);
    };

    darkModeMediaQuery.addEventListener('change', handleChange);
    return () => darkModeMediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Check if models are configured
  const checkModelConfiguration = useCallback(async () => {
    try {
      const configuredAgents = await agentModelStore.getConfiguredAgents();

      // CRITICAL: Check if BOTH planner AND navigator are configured
      // Both agents are required for the system to work
      const hasPlanner = configuredAgents.includes('planner' as any);
      const hasNavigator = configuredAgents.includes('navigator' as any);
      const allConfigured = hasPlanner && hasNavigator;
      
      console.log('🔍 Model configuration check:', { 
        configuredAgents, 
        hasPlanner, 
        hasNavigator, 
        allConfigured 
      });
      setHasConfiguredModels(allConfigured);
    } catch (error) {
      console.error('Error checking model configuration:', error);
      setHasConfiguredModels(false);
    }
  }, []);

  // Load general settings to check if replay is enabled
  const loadGeneralSettings = useCallback(async () => {
    try {
      const settings = await generalSettingsStore.getSettings();
      setReplayEnabled(settings.replayHistoricalTasks);
    } catch (error) {
      console.error('Error loading general settings:', error);
      setReplayEnabled(false);
    }
  }, []);

  // Load providers for configuration
  const loadProviders = useCallback(async () => {
    try {
      const allProviders = await llmProviderStore.getAllProviders();
      setProviders(allProviders);
      
      // Try to find the first configured provider (has API key)
      const configuredEntry = Object.entries(allProviders).find(([, cfg]) => Boolean(cfg?.apiKey?.trim()));
      if (configuredEntry) {
        const [pid, cfg] = configuredEntry as [string, ProviderConfig];
        setSingleProvider(pid);
        setSingleApiKey(cfg.apiKey || '');
        const models = (cfg.modelNames && cfg.modelNames.length > 0)
          ? cfg.modelNames
          : (llmProviderModelNames[pid as keyof typeof llmProviderModelNames] || []);
        setSingleModel(models[0] ? `${pid}>${models[0]}` : '');
      }
    } catch (error) {
      console.error('Error loading providers:', error);
      setProviders({});
    }
  }, []);

  // Save provider configuration
  const handleSaveProvider = useCallback(async () => {
    if (!singleProvider || !singleModel || !singleApiKey) {
      alert('Please fill all required fields');
      return;
    }
    
    try {
      // Save provider configuration
      const existing = providers[singleProvider];
      const cfg = (existing ? { ...existing } : getDefaultProviderConfig(singleProvider)) as ProviderConfig;
      cfg.apiKey = singleApiKey;
      if (cfg.type !== ProviderTypeEnum.AzureOpenAI) {
        cfg.modelNames = cfg.modelNames && cfg.modelNames.length > 0
          ? cfg.modelNames
          : (llmProviderModelNames[singleProvider as keyof typeof llmProviderModelNames] || []);
      }
      await llmProviderStore.setProvider(singleProvider, cfg as ProviderConfig);

      // Update agent models to the selected singleModel
      const [provider, modelName] = singleModel.split('>');
      if (provider && modelName) {
        const plannerParams = getDefaultAgentModelParams(provider, AgentNameEnum.Planner);
        const navigatorParams = getDefaultAgentModelParams(provider, AgentNameEnum.Navigator);
        await agentModelStore.setAgentModel(AgentNameEnum.Planner, { provider, modelName, parameters: plannerParams });
        await agentModelStore.setAgentModel(AgentNameEnum.Navigator, { provider, modelName, parameters: navigatorParams });
      }

      // Refresh providers and re-check configuration
      await loadProviders();
      await checkModelConfiguration();
      
      alert('Configuration saved successfully!');
    } catch (e) {
      console.error('Save failed:', e);
      alert('Failed to save configuration');
    }
  }, [singleProvider, singleModel, singleApiKey, providers, loadProviders, checkModelConfiguration]);

  // Check model configuration on mount
  useEffect(() => {
    checkModelConfiguration();
    loadGeneralSettings();
    loadProviders();
  }, [checkModelConfiguration, loadGeneralSettings, loadProviders]);

  // Reload messages from storage when panel becomes visible
  const reloadCurrentSession = useCallback(async () => {
    // CRITICAL: Don't reload if we don't have a tab ID yet
    // This prevents checking wrong tab during initialization
    if (!tabIdRef.current) {
      console.log('⏸️ Skipping reload - no tab ID yet');
      return;
    }
    
    // CRITICAL: Verify we're on the correct tab before reloading
    // This prevents loading messages from the wrong tab when switching quickly
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const activeTabId = tabs[0]?.id;
      
      if (activeTabId && activeTabId !== tabIdRef.current) {
        console.log('⚠️ Tab mismatch detected! Active:', activeTabId, 'Current:', tabIdRef.current);
        console.log('Reinitializing for correct tab...');
        await initializeTabContext(activeTabId);
        return;
      }
      
    } catch (error) {
      console.error('Failed to verify tab:', error);
    }
    
    // CRITICAL: Always reload messages from storage first
    // This ensures we show completed tasks even if we weren't connected when they finished
    if (sessionIdRef.current && tabChatHistoryStore) {
      try {
        const session = await tabChatHistoryStore.getSession(sessionIdRef.current);
        if (session && session.messages.length > 0) {
          // Always reload from storage to ensure we have the latest messages
          // Filter out progress messages from storage (they're temporary UI state)
          const storedMessages = session.messages.filter(msg => msg.messageType !== 'progress');
          
          setMessages(prevMessages => {
            // Filter out progress messages from current state too
            const currentNonProgress = prevMessages.filter(msg => msg.messageType !== 'progress');
            
            // If storage has more messages, use storage version
            if (storedMessages.length > currentNonProgress.length) {
              console.log(`✅ Reloaded ${storedMessages.length - currentNonProgress.length} new messages from storage`);
              return storedMessages;
            }
            
            // If same count, check if content differs (messages might have been updated)
            if (storedMessages.length === currentNonProgress.length && storedMessages.length > 0) {
              const lastStoredContent = storedMessages[storedMessages.length - 1]?.content;
              const lastCurrentContent = currentNonProgress[currentNonProgress.length - 1]?.content;
              
              if (lastStoredContent !== lastCurrentContent) {
                console.log(`✅ Reloaded updated messages from storage`);
                return storedMessages;
              }
            }
            
            return prevMessages;
          });
        }
      } catch (error) {
        console.error('Failed to reload session:', error);
      }
    }
    
    // CRITICAL: After reloading from storage, check if executor is still running
    // This ensures UI state matches executor state (stop button, input disabled, thinking block)
    if (portRef.current && tabIdRef.current) {
      console.log('🔍 Checking executor status for tab:', tabIdRef.current);
      portRef.current.postMessage({ 
        type: 'check_executor_status', 
        tabId: tabIdRef.current 
      });
    }
  }, [tabChatHistoryStore]);

  // Re-check model configuration when the side panel becomes visible or focused
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (!document.hidden) {
        console.log('📋 Side panel became visible, rechecking configuration...');
        // Panel became visible, check if we're on the correct tab
        try {
          const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
          const activeTabId = tabs[0]?.id;
          
          if (activeTabId && activeTabId !== tabIdRef.current) {
            console.log('🔄 Active tab changed while panel was hidden!', tabIdRef.current, '→', activeTabId);
            console.log('Reinitializing for correct tab...');
            
            // Clear current state
            setMessages([]);
            setCurrentSessionId(null);
            sessionIdRef.current = null;
            setIsFollowUpMode(false);
            setIsHistoricalSession(false);
            setShowHistory(false);
            setCurrentThinking([]);
            currentThinkingRef.current = [];
            setCurrentTaskId(null);
            setCurrentTaskState('idle');
            
            // Reinitialize with correct tab
            await initializeTabContext();
          } else {
            // Same tab, just reload session and recheck config
            checkModelConfiguration();
            loadGeneralSettings();
            reloadCurrentSession();
          }
        } catch (error) {
          console.error('Failed to check active tab:', error);
          // Fallback to normal reload
          checkModelConfiguration();
          loadGeneralSettings();
          reloadCurrentSession();
        }
      }
    };
    
    // Also recheck when window gains focus (e.g., clicking on side panel after settings)
    const handleFocus = () => {
      console.log('🎯 Side panel gained focus, rechecking configuration...');
      checkModelConfiguration();
      loadGeneralSettings();
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [checkModelConfiguration, loadGeneralSettings, reloadCurrentSession, initializeTabContext]);

  useEffect(() => {
    sessionIdRef.current = currentSessionId;
  }, [currentSessionId]);

  useEffect(() => {
    isReplayingRef.current = isReplaying;
  }, [isReplaying]);

  // Periodic message sync - reload messages every 2 seconds when a task is running
  useEffect(() => {
    if (!showStopButton || !sessionIdRef.current) {
      return; // Only poll when a task is actively running
    }

    const pollInterval = setInterval(() => {
      reloadCurrentSession();
    }, 2000); // Poll every 2 seconds

    return () => {
      clearInterval(pollInterval);
    };
  }, [showStopButton, reloadCurrentSession]);

  const appendMessage = useCallback((newMessage: Message, sessionId?: string | null) => {
    const isProgressMessage = newMessage.content === progressMessage;

    setMessages(prev => {
      // DON'T filter progress messages anymore - let handleTaskState manage them
      return [...prev, newMessage];
    });

    const effectiveSessionId = sessionId !== undefined ? sessionId : sessionIdRef.current;

    // Save to storage (skip progress/thinking messages)
    if (effectiveSessionId && !isProgressMessage && newMessage.messageType !== 'thinking' && tabChatHistoryStore) {
      tabChatHistoryStore
        .addMessage(effectiveSessionId, newMessage)
        .catch(err => console.error('Failed to save message to history:', err));
    }
  }, [tabChatHistoryStore]);

  const handleTaskState = useCallback(
    (event: AgentEvent) => {
      const { actor, state, timestamp, data } = event;
      const content = data?.details;

      // ===== HANDLE TASK START =====
      if (actor === Actors.SYSTEM && state === ExecutionState.TASK_START) {
        setCurrentThinking([]);
        currentThinkingRef.current = [];
        setCurrentTaskId(data.taskId);
        setIsHistoricalSession(false);
        setCurrentTaskState('starting');
        
        const progressMsg: Message = {
          actor: Actors.SYSTEM,
          content: progressMessage,
          timestamp: timestamp,
          messageType: 'progress',
          taskId: data.taskId
        };
        
        setMessages(prev => [...prev, progressMsg]);
        return;
      }

      // ===== HANDLE THINKING STEPS =====
      // Show planner/navigator messages as regular messages (no thinking block)
      const isThinking = isThinkingEvent(actor, state);
      if (isThinking && content) {
        setCurrentTaskState('thinking');
        
        // Show as a regular assistant message
        const thinkingMessage: Message = {
          actor: actor, // Keep original actor (planner/navigator)
          content: content,
          timestamp: timestamp,
          messageType: 'assistant',
          taskId: data.taskId
        };
        
        // Remove progress message (3 dots) and add thinking message
        setMessages(prev => {
          const filtered = prev.filter(
            msg => !(msg.taskId === data.taskId && msg.messageType === 'progress')
          );
          return [...filtered, thinkingMessage];
        });
        return; // Exit here
      }

      // ===== HANDLE FINAL EVENTS =====
      const isFinal = isFinalEvent(actor, state);
      if (isFinal) {
        setCurrentTaskState('complete');
        
        // DON'T add final message here - it's saved by background script to storage
        // The polling mechanism will load it from storage automatically
        // This prevents duplicate final messages
        
        // Just remove progress messages (3 dots)
        setMessages(prev => {
          return prev.filter(
            msg => !(msg.taskId === data.taskId && msg.messageType === 'progress')
          );
        });
        
        // ALWAYS clear state and update UI, even if no content
        setCurrentThinking([]);
        currentThinkingRef.current = [];
        setCurrentTaskId(null);
        setCurrentTaskState('idle');
        
        // Clear task timeout
        if (taskTimeoutRef.current) {
          clearTimeout(taskTimeoutRef.current);
          taskTimeoutRef.current = null;
        }
        
        // Handle UI state - CRITICAL: Always update UI state for final events
        if (actor === Actors.SYSTEM) {
          switch (state) {
            case ExecutionState.TASK_OK:
            case ExecutionState.TASK_FAIL:
              setIsFollowUpMode(true);
              setInputEnabled(true);
              setShowStopButton(false); // ← This must always run!
              setIsReplaying(false);
              break;
            case ExecutionState.TASK_CANCEL:
              setIsFollowUpMode(false);
              setInputEnabled(true);
              setShowStopButton(false); // ← This must always run!
              setIsReplaying(false);
              break;
          }
        }
        return;
      }

      // Skip all other unhandled events
      return;
    },
    [appendMessage],
  );

  // Stop heartbeat and close connection
  const stopConnection = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    if (portRef.current) {
      portRef.current.disconnect();
      portRef.current = null;
    }
  }, []);

  // Setup connection management
  const setupConnection = useCallback(() => {
    // Only setup if no existing connection
    if (portRef.current) {
      return;
    }

    // Require tab ID to be set before connecting
    if (!tabIdRef.current) {
      console.error('Cannot setup connection: tab ID not available');
      return;
    }

    try {
      // Use tab-specific connection name
      const connectionName = `side-panel-connection-${tabIdRef.current}`;
      portRef.current = chrome.runtime.connect({ name: connectionName });

      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      portRef.current.onMessage.addListener((message: any) => {
        // Add type checking for message
        if (message && message.type === EventType.EXECUTION) {
          handleTaskState(message);
        } else if (message && message.type === 'thinking_steps') {
          // Handle thinking steps response from executor
          console.log('Received thinking steps from executor:', message.steps.length);
          if (message.steps && message.steps.length > 0) {
            // Update currentThinkingRef with all thinking steps from executor
            currentThinkingRef.current = message.steps.map((step: any) => ({
              actor: step.actor,
              content: step.content,
              timestamp: step.timestamp
            }));
            // Also update the live thinking state for display
            setCurrentThinking([...currentThinkingRef.current]);
          }
        } else if (message && message.type === 'executor_status') {
          // Handle executor status response
          console.log('📊 Executor status:', 'running:', message.isRunning, 'steps:', message.thinkingSteps?.length || 0);
          
          if (message.isRunning) {
            // Executor is running - update UI to show active state
            console.log('✅ Executor is running, updating UI state');
            setShowStopButton(true);
            setInputEnabled(false);
            setCurrentTaskState('thinking');
            
            // Add progress message (3 dots) if not already present
            setMessages(prev => {
              const hasProgress = prev.some(msg => msg.messageType === 'progress');
              if (!hasProgress) {
                const progressMsg: Message = {
                  actor: Actors.SYSTEM,
                  content: progressMessage,
                  timestamp: Date.now(),
                  messageType: 'progress',
                  taskId: message.taskId || 'unknown'
                };
                return [...prev, progressMsg];
              }
              return prev;
            });
            
            // Update thinking steps if available
            if (message.thinkingSteps && message.thinkingSteps.length > 0) {
              currentThinkingRef.current = message.thinkingSteps.map((step: any) => ({
                actor: step.actor,
                content: step.content,
                timestamp: step.timestamp
              }));
              setCurrentThinking([...currentThinkingRef.current]);
            } else {
              // Executor is running but no steps yet - show "Starting..." placeholder
              console.log('⏳ Executor running but no steps yet, showing placeholder');
              currentThinkingRef.current = [{
                actor: Actors.SYSTEM,
                content: 'Starting task...',
                timestamp: Date.now(),
                state: 'task.start'
              }];
              setCurrentThinking([...currentThinkingRef.current]);
            }
          } else {
            // Executor is not running - ensure UI shows idle state
            console.log('⏹️ Executor is not running, UI should be idle');
            setShowStopButton(false);
            setInputEnabled(true);
            setCurrentTaskState('idle');
          }
        } else if (message && message.type === 'error') {
          // Handle error messages from service worker
          appendMessage({
            actor: Actors.SYSTEM,
            content: message.error || t('errors_unknown'),
            timestamp: Date.now(),
          });
          setInputEnabled(true);
          setShowStopButton(false);
        } else if (message && message.type === 'heartbeat_ack') {
          console.log('Heartbeat acknowledged');
        }
      });

      portRef.current.onDisconnect.addListener(() => {
        const error = chrome.runtime.lastError;
        console.log('Connection disconnected', error ? `Error: ${error.message}` : '');
        portRef.current = null;
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
          heartbeatIntervalRef.current = null;
        }
        
        // If a task is running (stop button visible), attempt to reconnect
        // This handles transient disconnections during navigation/tab switches
        if (showStopButton) {
          console.log('Task is running, attempting to reconnect...');
          setTimeout(() => {
            if (!portRef.current && tabIdRef.current) {
              console.log('Reconnecting to background service...');
              setupConnection();
              
              // CRITICAL: Request current thinking steps from executor after reconnecting
              // This ensures we show all thinking steps, not just the ones after reconnection
              setTimeout(() => {
                if (portRef.current && tabIdRef.current) {
                  console.log('Requesting thinking steps from executor...');
                  portRef.current.postMessage({ 
                    type: 'get_thinking_steps', 
                    tabId: tabIdRef.current 
                  });
                }
              }, 100); // Small delay to ensure connection is established
            }
          }, 500); // Short delay before reconnection
        } else {
          // No task running, just update UI state
          setInputEnabled(true);
          setShowStopButton(false);
        }
      });

      // Setup heartbeat interval
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }

      heartbeatIntervalRef.current = window.setInterval(() => {
        // Check if port exists and has a valid tab-specific connection name
        if (portRef.current?.name && portRef.current.name.startsWith('side-panel-connection')) {
          try {
            portRef.current.postMessage({ type: 'heartbeat' });
          } catch (error) {
            console.error('Heartbeat failed:', error);
            stopConnection(); // Stop connection if heartbeat fails
          }
        } else {
          stopConnection(); // Stop if port is invalid
        }
      }, 25000);
    } catch (error) {
      console.error('Failed to establish connection:', error);
      appendMessage({
        actor: Actors.SYSTEM,
        content: t('errors_conn_serviceWorker'),
        timestamp: Date.now(),
      });
      // Clear any references since connection failed
      portRef.current = null;
    }
  }, [handleTaskState, appendMessage, stopConnection]);

  // CRITICAL: Setup connection immediately when tab ID is available
  // This ensures the port is ready BEFORE user sends any messages
  useEffect(() => {
    if (needsConnection && tabIdRef.current && !portRef.current) {
      console.log('🔌 Setting up connection for tab:', tabIdRef.current);
      setupConnection();
      setNeedsConnection(false); // Reset flag
    }
  }, [needsConnection, setupConnection]); // Trigger when flag is set

  // Add safety check for message sending
  const sendMessage = useCallback(
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    (message: any) => {
      if (!portRef.current) {
        throw new Error('No valid connection available');
      }
      try {
        portRef.current.postMessage(message);
      } catch (error) {
        console.error('Failed to send message:', error);
        stopConnection(); // Stop connection when message sending fails
        throw error;
      }
    },
    [stopConnection],
  );

  // Handle replay command
  const handleReplay = async (historySessionId: string): Promise<void> => {
    try {
      // Check if replay is enabled in settings
      if (!replayEnabled) {
        appendMessage({
          actor: Actors.SYSTEM,
          content: t('chat_replay_disabled'),
          timestamp: Date.now(),
        });
        return;
      }

      // Check if history exists using loadAgentStepHistory
      if (!tabChatHistoryStore) {
        throw new Error('Chat history store not initialized');
      }
      const historyData = await tabChatHistoryStore.loadAgentStepHistory(historySessionId);
      if (!historyData) {
        appendMessage({
          actor: Actors.SYSTEM,
          content: t('chat_replay_noHistory', historySessionId.substring(0, 20)),
          timestamp: Date.now(),
        });
        return;
      }

      // Use the stored tab ID (don't query active tab!)
      const tabId = tabIdRef.current;
      if (!tabId) {
        throw new Error('Tab ID not initialized');
      }

      // Clear messages if we're in a historical session
      if (isHistoricalSession) {
        setMessages([]);
      }

      // Create a new chat session for this replay task
      const newSession = await tabChatHistoryStore.createSession(`Replay of ${historySessionId.substring(0, 20)}...`);
      console.log('newSession for replay', newSession);

      // Store the new session ID in both state and ref
      const newTaskId = newSession.id;
      setCurrentSessionId(newTaskId);
      sessionIdRef.current = newTaskId;

      // Send replay command to background
      setInputEnabled(false);
      setShowStopButton(true);

      // Reset follow-up mode and historical session flags
      setIsFollowUpMode(false);
      setIsHistoricalSession(false);

      const userMessage = {
        actor: Actors.USER,
        content: `/replay ${historySessionId}`,
        timestamp: Date.now(),
      };

      // Add the user message to the new session
      appendMessage(userMessage, sessionIdRef.current);

      // Setup connection if not exists
      if (!portRef.current) {
        setupConnection();
      }

      // Send replay command to background with the task from history
      portRef.current?.postMessage({
        type: 'replay',
        taskId: newTaskId,
        tabId: tabId,
        historySessionId: historySessionId,
        task: historyData.task, // Add the task from history
      });

      appendMessage({
        actor: Actors.SYSTEM,
        content: t('chat_replay_starting', historyData.task),
        timestamp: Date.now(),
      });
      setIsReplaying(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      appendMessage({
        actor: Actors.SYSTEM,
        content: t('chat_replay_failed', errorMessage),
        timestamp: Date.now(),
      });
    }
  };

  // Handle chat commands that start with /
  const handleCommand = async (command: string): Promise<boolean> => {
    try {
      // Setup connection if not exists
      if (!portRef.current) {
        setupConnection();
      }

      // Handle different commands
      if (command === '/state') {
        portRef.current?.postMessage({
          type: 'state',
        });
        return true;
      }

      if (command === '/nohighlight') {
        portRef.current?.postMessage({
          type: 'nohighlight',
        });
        return true;
      }

      if (command.startsWith('/replay ')) {
        // Parse replay command: /replay <historySessionId>
        // Handle multiple spaces by filtering out empty strings
        const parts = command.split(' ').filter(part => part.trim() !== '');
        if (parts.length !== 2) {
          appendMessage({
            actor: Actors.SYSTEM,
            content: t('chat_replay_invalidArgs'),
            timestamp: Date.now(),
          });
          return true;
        }

        const historySessionId = parts[1];
        await handleReplay(historySessionId);
        return true;
      }

      // Unsupported command
      appendMessage({
        actor: Actors.SYSTEM,
        content: t('errors_cmd_unknown', command),
        timestamp: Date.now(),
      });
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('Command error', errorMessage);
      appendMessage({
        actor: Actors.SYSTEM,
        content: errorMessage,
        timestamp: Date.now(),
      });
      return true;
    }
  };

  const handleSendMessage = async (text: string, displayText?: string) => {
    console.log('handleSendMessage', text);

    // Trim the input text first
    const trimmedText = text.trim();

    if (!trimmedText) return;
    
    // Clear the stored input text for this tab when message is sent
    if (tabIdRef.current !== null) {
      tabInputTextRef.current.delete(tabIdRef.current);
      currentInputTextRef.current = '';
    }

    // Check if the input is a command (starts with /)
    if (trimmedText.startsWith('/')) {
      // Process command and return if it was handled
      const wasHandled = await handleCommand(trimmedText);
      if (wasHandled) return;
    }

    // Block sending messages in historical sessions
    if (isHistoricalSession) {
      console.log('Cannot send messages in historical sessions');
      return;
    }

    try {
      // Use the stored tab ID (don't query active tab!)
      const tabId = tabIdRef.current;
      if (!tabId) {
        throw new Error('Tab ID not initialized');
      }

      setInputEnabled(false);
      setShowStopButton(true);

      // Clear any existing timeout
      if (taskTimeoutRef.current) {
        clearTimeout(taskTimeoutRef.current);
      }

      // Set a 5-minute timeout to prevent infinite loading
      taskTimeoutRef.current = window.setTimeout(() => {
        console.error('Task timeout: No response from background after 5 minutes');
        appendMessage({
          actor: Actors.SYSTEM,
          content: 'Task timed out. The executor may have encountered an error. Please try again.',
          timestamp: Date.now(),
        });
        setInputEnabled(true);
        setShowStopButton(false);
        setIsFollowUpMode(false);
      }, 5 * 60 * 1000); // 5 minutes

      // Create a new chat session for this task if not in follow-up mode
      if (!isFollowUpMode) {
        if (!tabChatHistoryStore) {
          throw new Error('Chat history store not initialized');
        }
        // Use display text for session title if available, otherwise use full text
        const titleText = displayText || text;
        const newSession = await tabChatHistoryStore.createSession(
          titleText.substring(0, 50) + (titleText.length > 50 ? '...' : ''),
        );
        console.log('newSession', newSession);

        // Store the session ID in both state and ref
        const sessionId = newSession.id;
        setCurrentSessionId(sessionId);
        sessionIdRef.current = sessionId;
      }

      const userMessage = {
        actor: Actors.USER,
        content: displayText || text, // Use display text for chat UI, full text for background service
        timestamp: Date.now(),
      };

      // Pass the sessionId directly to appendMessage
      appendMessage(userMessage, sessionIdRef.current);

      // Setup connection if not exists
      if (!portRef.current) {
        setupConnection();
      }

      // Send message using the utility function
      if (isFollowUpMode) {
        // Send as follow-up task
        await sendMessage({
          type: 'follow_up_task',
          task: text,
          taskId: sessionIdRef.current,
          tabId,
        });
        console.log('follow_up_task sent', text, tabId, sessionIdRef.current);
      } else {
        // Send as new task
        await sendMessage({
          type: 'new_task',
          task: text,
          taskId: sessionIdRef.current,
          tabId,
        });
        console.log('new_task sent', text, tabId, sessionIdRef.current);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('Task error', errorMessage);
      appendMessage({
        actor: Actors.SYSTEM,
        content: errorMessage,
        timestamp: Date.now(),
      });
      setInputEnabled(true);
      setShowStopButton(false);
      stopConnection();
    }
  };

  const handleStopTask = async () => {
    try {
      portRef.current?.postMessage({
        type: 'cancel_task',
        tabId: tabIdRef.current,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('cancel_task error', errorMessage);
      appendMessage({
        actor: Actors.SYSTEM,
        content: errorMessage,
        timestamp: Date.now(),
      });
    }
    setInputEnabled(true);
    setShowStopButton(false);
  };

  const handleNewChat = () => {
    // Clear messages and start a new chat
    setMessages([]);
    setCurrentSessionId(null);
    sessionIdRef.current = null;
    setInputEnabled(true);
    setShowStopButton(false);
    setIsFollowUpMode(false);
    setIsHistoricalSession(false);

    // Disconnect any existing connection
    stopConnection();
  };

  const loadChatSessions = useCallback(async () => {
    try {
      if (!tabChatHistoryStore) {
        console.error('Chat history store not initialized');
        return;
      }
      const sessions = await tabChatHistoryStore.getSessionsMetadata();
      setChatSessions(sessions.sort((a, b) => b.createdAt - a.createdAt));
    } catch (error) {
      console.error('Failed to load chat sessions:', error);
    }
  }, [tabChatHistoryStore]);

  const handleLoadHistory = async () => {
    await loadChatSessions();
    setShowHistory(true);
  };

  const handleBackToChat = (reset = false) => {
    setShowHistory(false);
    if (reset) {
      setCurrentSessionId(null);
      setMessages([]);
      setIsFollowUpMode(false);
      setIsHistoricalSession(false);
    }
  };

  const handleSessionSelect = async (sessionId: string) => {
    try {
      if (!tabChatHistoryStore) {
        console.error('Chat history store not initialized');
        return;
      }
      const fullSession = await tabChatHistoryStore.getSession(sessionId);
      if (fullSession && fullSession.messages.length > 0) {
        setCurrentSessionId(fullSession.id);
        setMessages(fullSession.messages);
        setIsFollowUpMode(false);
        setIsHistoricalSession(true); // Mark this as a historical session
        console.log('history session selected', sessionId);
      }
      setShowHistory(false);
    } catch (error) {
      console.error('Failed to load session:', error);
    }
  };

  const handleSessionDelete = async (sessionId: string) => {
    try {
      if (!tabChatHistoryStore) {
        console.error('Chat history store not initialized');
        return;
      }
      await tabChatHistoryStore.deleteSession(sessionId);
      await loadChatSessions();
      if (sessionId === currentSessionId) {
        setMessages([]);
        setCurrentSessionId(null);
      }
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  };

  const handleSessionBookmark = async (sessionId: string) => {
    try {
      if (!tabChatHistoryStore) {
        console.error('Chat history store not initialized');
        return;
      }
      const fullSession = await tabChatHistoryStore.getSession(sessionId);

      if (fullSession && fullSession.messages.length > 0) {
        // Get the session title
        const sessionTitle = fullSession.title;
        // Get the first 8 words of the title
        const title = sessionTitle.split(' ').slice(0, 8).join(' ');

        // Get the first message content (the task)
        const taskContent = fullSession.messages[0]?.content || '';

        // Add to favorites storage
        await favoritesStorage.addPrompt(title, taskContent);

        // Update favorites in the UI
        const prompts = await favoritesStorage.getAllPrompts();
        setFavoritePrompts(prompts);

        // Return to chat view after pinning
        handleBackToChat(true);
      }
    } catch (error) {
      console.error('Failed to pin session to favorites:', error);
    }
  };

  const handleBookmarkSelect = (content: string) => {
    if (setInputTextRef.current) {
      setInputTextRef.current(content);
    }
  };

  const handleBookmarkUpdateTitle = async (id: number, title: string) => {
    try {
      await favoritesStorage.updatePromptTitle(id, title);

      // Update favorites in the UI
      const prompts = await favoritesStorage.getAllPrompts();
      setFavoritePrompts(prompts);
    } catch (error) {
      console.error('Failed to update favorite prompt title:', error);
    }
  };

  const handleBookmarkDelete = async (id: number) => {
    try {
      await favoritesStorage.removePrompt(id);

      // Update favorites in the UI
      const prompts = await favoritesStorage.getAllPrompts();
      setFavoritePrompts(prompts);
    } catch (error) {
      console.error('Failed to delete favorite prompt:', error);
    }
  };

  const handleBookmarkReorder = async (draggedId: number, targetId: number) => {
    try {
      // Directly pass IDs to storage function - it now handles the reordering logic
      await favoritesStorage.reorderPrompts(draggedId, targetId);

      // Fetch the updated list from storage to get the new IDs and reflect the authoritative order
      const updatedPromptsFromStorage = await favoritesStorage.getAllPrompts();
      setFavoritePrompts(updatedPromptsFromStorage);
    } catch (error) {
      console.error('Failed to reorder favorite prompts:', error);
    }
  };

  // Load favorite prompts from storage
  useEffect(() => {
    const loadFavorites = async () => {
      try {
        const prompts = await favoritesStorage.getAllPrompts();
        setFavoritePrompts(prompts);
      } catch (error) {
        console.error('Failed to load favorite prompts:', error);
      }
    };

    loadFavorites();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopConnection();
    };
  }, [stopConnection]);

  // Scroll to bottom when new messages arrive
  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div>
      <div
        className={`flex h-screen flex-col overflow-hidden rounded-2xl`}>
        <header className="header relative">
          <div className="header-logo">
            {showHistory && (
              <button
                type="button"
                onClick={() => handleBackToChat(false)}
                className={`text-white hover:text-white cursor-pointer`}
                aria-label={t('nav_back_a11y')}>
                {t('nav_back')}
              </button>
            )}
          </div>
          <div className="header-icons">
            <button
              type="button"
              onClick={() => chrome.runtime.openOptionsPage()}
              onKeyDown={e => e.key === 'Enter' && chrome.runtime.openOptionsPage()}
              className={`header-icon text-white hover:text-white cursor-pointer`}
              aria-label={t('nav_settings_a11y')}
              tabIndex={0}>
              <FiSettings size={20} />
            </button>
          </div>
        </header>
        {showHistory ? (
          <div className="flex-1 overflow-hidden">
            <ChatHistoryList
              sessions={chatSessions}
              onSessionSelect={handleSessionSelect}
              onSessionDelete={handleSessionDelete}
              onSessionBookmark={handleSessionBookmark}
              visible={true}
              isDarkMode={isDarkMode}
            />
          </div>
        ) : (
          <>
            {/* Show loading state while checking model configuration */}
            {hasConfiguredModels === null && (
              <div
                className={`flex flex-1 items-center justify-center p-8 ${isDarkMode ? 'text-sky-300' : 'text-sky-600'}`}>
                <div className="text-center">
                  <div className="mx-auto mb-4 size-8 animate-spin rounded-full border-2 border-sky-400 border-t-transparent"></div>
                  <p>{t('status_checkingConfig')}</p>
                </div>
              </div>
            )}

            {/* Show setup message when no models are configured */}
            {hasConfiguredModels === false && (
              <div
                className={`flex flex-1 items-center justify-center px-8 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                <div className="max-w-md w-full text-center">
                  <img src="/icon-128.png" alt="Verse Logo" className="mx-auto mb-6 size-20" />
                  <p className="mb-8 text-base">To get started, please configure your API Keys in settings.</p>
                  
                  {/* Open Settings Button */}
                  <button
                    onClick={() => chrome.runtime.openOptionsPage()}
                    className={`mx-auto px-6 py-2.5 text-sm font-medium rounded-full border-2 transition-colors ${
                      isDarkMode 
                        ? 'border-gray-400 text-gray-300 hover:border-gray-300 hover:bg-gray-800/30' 
                        : 'border-gray-500 text-gray-700 hover:border-gray-600 hover:bg-gray-100/30'
                    }`}>
                    Open Settings
                  </button>
                </div>
              </div>
            )}

            {/* Show normal chat interface when models are configured */}
            {hasConfiguredModels === true && (
              <>
                {/* Messages area */}
                {messages.length > 0 ? (
                  <div
                    className="flex-1 overflow-x-hidden overflow-y-scroll scroll-smooth p-2 scrollbar-hide"
                    style={{ backgroundColor: '#242424' }}>
                    <MessageList messages={messages} isDarkMode={isDarkMode} />
                    <div ref={messagesEndRef} />
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto relative">
                    {/* Centered logo with low opacity */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <img 
                        src="/verse-logo-white.png" 
                        alt="Verse Logo" 
                        className="w-48 h-48 object-contain opacity-5"
                      />
                    </div>
                    
                    {/* Bookmarks on top of logo */}
                    <div className="relative z-10">
                      <BookmarkList
                        bookmarks={favoritePrompts}
                        onBookmarkSelect={handleBookmarkSelect}
                        onBookmarkUpdateTitle={handleBookmarkUpdateTitle}
                        onBookmarkDelete={handleBookmarkDelete}
                        onBookmarkReorder={handleBookmarkReorder}
                        isDarkMode={isDarkMode}
                      />
                    </div>
                  </div>
                )}
                
                {/* Chat input always at bottom */}
                <div
                  className={`p-2 shadow-sm backdrop-blur-sm`}>
                  <ChatInput
                    onSendMessage={handleSendMessage}
                    onStopTask={handleStopTask}
                    disabled={!inputEnabled || isHistoricalSession}
                    showStopButton={showStopButton}
                    setContent={setter => {
                      setInputTextRef.current = setter;
                    }}
                    onTextChange={(text: string) => {
                      currentInputTextRef.current = text;
                    }}
                    isDarkMode={isDarkMode}
                    historicalSessionId={isHistoricalSession && replayEnabled ? currentSessionId : null}
                    onReplay={handleReplay}
                  />
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SidePanel;
