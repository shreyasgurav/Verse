import 'webextension-polyfill';
import {
  agentModelStore,
  AgentNameEnum,
  firewallStore,
  generalSettingsStore,
  llmProviderStore,
  analyticsSettingsStore,
} from '@extension/storage';
import { t } from '@extension/i18n';
import BrowserContext from './browser/context';
import { Executor } from './agent/executor';
import { createLogger } from './log';
import { ExecutionState, EventType, Actors } from './agent/event/types';
import { createChatModel } from './agent/helper';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { DEFAULT_AGENT_OPTIONS } from './agent/types';
import { SpeechToTextService } from './services/speechToText';
import { injectBuildDomTreeScripts } from './browser/dom/service';
import { analytics } from './services/analytics';

const logger = createLogger('background');

// Tab-specific browser contexts, executors and ports for multi-instance support
const tabBrowserContexts = new Map<number, BrowserContext>();
const tabExecutors = new Map<number, Executor>();
const tabPorts = new Map<number, chrome.runtime.Port>();
const portToTabId = new Map<chrome.runtime.Port, number>();

// Helper function to get or create browser context for a tab
function getOrCreateBrowserContext(tabId: number): BrowserContext {
  let context = tabBrowserContexts.get(tabId);
  if (!context) {
    context = new BrowserContext({});
    // CRITICAL: Set the tab ID immediately so the context knows which tab it belongs to
    // This prevents the context from using the "active tab" when getCurrentPage() is called
    context.updateCurrentTabId(tabId);
    tabBrowserContexts.set(tabId, context);
    logger.info('Created new browser context for tab:', tabId);
  }
  return context;
}

// Setup side panel behavior - enable tab-specific side panels
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(error => console.error(error));

// Enable tab-specific side panels for each tab
// NOTE: We set enabled: true but the panel won't auto-open due to openPanelOnActionClick: true
// The panel will only open when user clicks the extension icon
chrome.tabs.onCreated.addListener(async (tab) => {
  if (tab.id) {
    try {
      await chrome.sidePanel.setOptions({
        tabId: tab.id,
        path: `side-panel/index.html?tabId=${tab.id}`,
        enabled: true // Enabled but not opened - user must click extension icon
      });
      logger.info('Tab-specific side panel enabled for tab:', tab.id);
    } catch (error) {
      logger.error('Failed to enable tab-specific side panel:', error);
    }
  }
});

// Also enable for existing tabs on extension load
chrome.tabs.query({}).then(tabs => {
  tabs.forEach(async (tab) => {
    if (tab.id) {
      try {
        await chrome.sidePanel.setOptions({
          tabId: tab.id,
          path: `side-panel/index.html?tabId=${tab.id}`,
          enabled: true
        });
      } catch (error) {
        // Ignore errors for tabs that don't support side panels
      }
    }
  });
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // Set tab-specific side panel for this tab (in case it wasn't set before)
  if (tabId && changeInfo.status === 'loading') {
    try {
      await chrome.sidePanel.setOptions({
        tabId: tabId,
        path: `side-panel/index.html?tabId=${tabId}`,
        enabled: true
      });
    } catch (error) {
      // Ignore errors - tab might not support side panels
    }
  }
  
  if (tabId && changeInfo.status === 'complete' && tab.url?.startsWith('http')) {
    await injectBuildDomTreeScripts(tabId);
  }
});

// Listen for debugger detached event
// Only cancel executor if user explicitly cancels, not for other reasons
chrome.debugger.onDetach.addListener(async (source, reason) => {
  logger.info('Debugger detached - tabId:', source.tabId, 'reason:', reason);
  
  // Only cancel and cleanup if user explicitly canceled
  // Don't cancel for other reasons like 'target_closed', 'replaced_with_devtools', etc.
  if (reason === 'canceled_by_user') {
    if (source.tabId) {
      logger.info('User canceled debugger, canceling executor for tab:', source.tabId);
      const executor = tabExecutors.get(source.tabId);
      if (executor) {
        await executor.cancel();
      }
      // Clean up tab-specific browser context
      const context = tabBrowserContexts.get(source.tabId);
      if (context) {
        await context.cleanup();
        tabBrowserContexts.delete(source.tabId);
      }
    }
  } else {
    // For other detach reasons (timeout, navigation, etc.), log but don't cancel
    // The Page class will attempt to reattach automatically when needed
    logger.warning(`Debugger detached (${reason}) for tab ${source.tabId} - will attempt to reattach on next operation`);
  }
});

// Cleanup when tab is closed
chrome.tabs.onRemoved.addListener(async tabId => {
  // Clean up tab-specific browser context
  const context = tabBrowserContexts.get(tabId);
  if (context) {
    context.removeAttachedPage(tabId);
    await context.cleanup();
    tabBrowserContexts.delete(tabId);
  }
  
  // Clean up tab-specific executor and port
  const executor = tabExecutors.get(tabId);
  if (executor) {
    await executor.cancel();
    await executor.cleanup();
    tabExecutors.delete(tabId);
  }
  
  const port = tabPorts.get(tabId);
  if (port) {
    portToTabId.delete(port);
    tabPorts.delete(tabId);
  }
  
  // Clean up task session tracking
  taskSessionTabs.delete(tabId);
  
  // Also remove this tab from any other task sessions it might be part of
  for (const [originalTabId, relatedTabs] of taskSessionTabs.entries()) {
    if (relatedTabs.has(tabId)) {
      relatedTabs.delete(tabId);
      logger.info(`Removed closed tab ${tabId} from task session ${originalTabId}`);
    }
  }
});

logger.info('background loaded');

// Initialize analytics
analytics.init().catch(error => {
  logger.error('Failed to initialize analytics:', error);
});

// Listen for analytics settings changes
analyticsSettingsStore.subscribe(() => {
  analytics.updateSettings().catch(error => {
    logger.error('Failed to update analytics settings:', error);
  });
});

// Listen for simple messages (e.g., from options page)
chrome.runtime.onMessage.addListener(() => {
  // Handle other message types if needed in the future
  // Return false if response is not sent asynchronously
  // return false;
});

// Setup connection listener for long-lived connections (e.g., side panel)
chrome.runtime.onConnect.addListener(port => {
  // Support both legacy format and new tab-specific format
  // New format: 'side-panel-connection-<tabId>'
  // Legacy format: 'side-panel-connection'
  const isLegacyConnection = port.name === 'side-panel-connection';
  const isTabConnection = port.name.startsWith('side-panel-connection-');
  
  if (isLegacyConnection || isTabConnection) {
    // Extract tab ID from connection name or wait for first message
    let tabId: number | null = null;
    
    if (isTabConnection) {
      const parts = port.name.split('-');
      tabId = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(tabId)) {
        tabPorts.set(tabId, port);
        portToTabId.set(port, tabId);
        logger.info('Tab-specific side panel connected:', tabId);
      }
    }

    port.onMessage.addListener(async message => {
      try {
        switch (message.type) {
          case 'heartbeat':
            // Acknowledge heartbeat
            port.postMessage({ type: 'heartbeat_ack' });
            break;

          case 'new_task': {
            if (!message.task) return port.postMessage({ type: 'error', error: t('bg_cmd_newTask_noTask') });
            if (!message.tabId) return port.postMessage({ type: 'error', error: t('bg_errors_noTabId') });

            logger.info('new_task', message.tabId, message.task);
            
            // Get or create tab-specific browser context
            const browserContext = getOrCreateBrowserContext(message.tabId);
            
            // Attach to the tab WITHOUT switching focus - allows background execution
            await browserContext.getPageForTab(message.tabId);
            
            const executor = await setupExecutor(message.taskId, message.task, browserContext, message.tabId);
            tabExecutors.set(message.tabId, executor);
            subscribeToExecutorEvents(executor, message.tabId);

            const result = await executor.execute();
            logger.info('new_task execution result', message.tabId, result);
            break;
          }

          case 'follow_up_task': {
            if (!message.task) return port.postMessage({ type: 'error', error: t('bg_cmd_followUpTask_noTask') });
            if (!message.tabId) return port.postMessage({ type: 'error', error: t('bg_errors_noTabId') });

            logger.info('follow_up_task', message.tabId, message.task);

            // If executor exists for this tab, add follow-up task
            const executor = tabExecutors.get(message.tabId);
            if (executor) {
              // Check if executor is already running - if so, queue the task but don't execute yet
              if (executor.isRunning()) {
                logger.warning('⚠️ Executor is already running, queueing follow-up task:', message.task);
                executor.addFollowUpTask(message.task);
                return port.postMessage({ 
                  type: 'warning', 
                  message: 'Task queued - executor is currently busy. It will run after the current task completes.' 
                });
              }
              
              executor.addFollowUpTask(message.task);
              // Re-subscribe to events in case the previous subscription was cleaned up
              subscribeToExecutorEvents(executor, message.tabId);
              const result = await executor.execute();
              logger.info('follow_up_task execution result', message.tabId, result);
            } else {
              // executor was cleaned up, can not add follow-up task
              logger.info('follow_up_task: executor was cleaned up, can not add follow-up task');
              return port.postMessage({ type: 'error', error: t('bg_cmd_followUpTask_cleaned') });
            }
            break;
          }

          case 'cancel_task': {
            if (!message.tabId) return port.postMessage({ type: 'error', error: t('bg_errors_noTabId') });
            const executor = tabExecutors.get(message.tabId);
            if (!executor) return port.postMessage({ type: 'error', error: t('bg_errors_noRunningTask') });
            await executor.cancel();
            break;
          }

          case 'resume_task': {
            if (!message.tabId) return port.postMessage({ type: 'error', error: t('bg_errors_noTabId') });
            const executor = tabExecutors.get(message.tabId);
            if (!executor) return port.postMessage({ type: 'error', error: t('bg_cmd_resumeTask_noTask') });
            await executor.resume();
            return port.postMessage({ type: 'success' });
          }

          case 'pause_task': {
            if (!message.tabId) return port.postMessage({ type: 'error', error: t('bg_errors_noTabId') });
            const executor = tabExecutors.get(message.tabId);
            if (!executor) return port.postMessage({ type: 'error', error: t('bg_errors_noRunningTask') });
            await executor.pause();
            return port.postMessage({ type: 'success' });
          }

          case 'screenshot': {
            if (!message.tabId) return port.postMessage({ type: 'error', error: t('bg_errors_noTabId') });
            const browserContext = getOrCreateBrowserContext(message.tabId);
            const page = await browserContext.switchTab(message.tabId);
            const screenshot = await page.takeScreenshot();
            logger.info('screenshot', message.tabId, screenshot);
            return port.postMessage({ type: 'success', screenshot });
          }

          case 'state': {
            try {
              // Get current tab ID from active tab
              const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
              const tabId = tabs[0]?.id;
              if (!tabId) return port.postMessage({ type: 'error', error: 'No active tab' });
              const browserContext = getOrCreateBrowserContext(tabId);
              const browserState = await browserContext.getState(true);
              const elementsText = browserState.elementTree.clickableElementsToString(
                DEFAULT_AGENT_OPTIONS.includeAttributes,
              );

              logger.info('state', browserState);
              logger.info('interactive elements', elementsText);
              return port.postMessage({ type: 'success', msg: t('bg_cmd_state_printed') });
            } catch (error) {
              logger.error('Failed to get state:', error);
              return port.postMessage({ type: 'error', error: t('bg_cmd_state_failed') });
            }
          }

          case 'nohighlight': {
            // Get current tab ID from active tab
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            const tabId = tabs[0]?.id;
            if (!tabId) return port.postMessage({ type: 'error', error: 'No active tab' });
            const browserContext = getOrCreateBrowserContext(tabId);
            const page = await browserContext.getCurrentPage();
            await page.removeHighlight();
            return port.postMessage({ type: 'success', msg: t('bg_cmd_nohighlight_ok') });
          }

          case 'speech_to_text': {
            try {
              if (!message.audio) {
                return port.postMessage({
                  type: 'speech_to_text_error',
                  error: t('bg_cmd_stt_noAudioData'),
                });
              }

              logger.info('Processing speech-to-text request...');

              // Get all providers for speech-to-text service
              const providers = await llmProviderStore.getAllProviders();

              // Create speech-to-text service with all providers
              const speechToTextService = await SpeechToTextService.create(providers);

              // Extract base64 audio data (remove data URL prefix if present)
              let base64Audio = message.audio;
              if (base64Audio.startsWith('data:')) {
                base64Audio = base64Audio.split(',')[1];
              }

              // Transcribe audio
              const transcribedText = await speechToTextService.transcribeAudio(base64Audio);

              logger.info('Speech-to-text completed successfully');
              return port.postMessage({
                type: 'speech_to_text_result',
                text: transcribedText,
              });
            } catch (error) {
              logger.error('Speech-to-text failed:', error);
              return port.postMessage({
                type: 'speech_to_text_error',
                error: error instanceof Error ? error.message : t('bg_cmd_stt_failed'),
              });
            }
          }

          case 'replay': {
            if (!message.tabId) return port.postMessage({ type: 'error', error: t('bg_errors_noTabId') });
            if (!message.taskId) return port.postMessage({ type: 'error', error: t('bg_errors_noTaskId') });
            if (!message.historySessionId)
              return port.postMessage({ type: 'error', error: t('bg_cmd_replay_noHistory') });
            logger.info('replay', message.tabId, message.taskId, message.historySessionId);

            try {
              // Get or create tab-specific browser context
              const browserContext = getOrCreateBrowserContext(message.tabId);
              // Attach to the tab WITHOUT switching focus for replay
              await browserContext.getPageForTab(message.tabId);
              // Setup executor with the new taskId and a dummy task description
              const executor = await setupExecutor(message.taskId, message.task, browserContext, message.tabId);
              tabExecutors.set(message.tabId, executor);
              subscribeToExecutorEvents(executor, message.tabId);

              // Run replayHistory with the history session ID
              const result = await executor.replayHistory(message.historySessionId);
              logger.debug('replay execution result', message.tabId, result);
            } catch (error) {
              logger.error('Replay failed:', error);
              return port.postMessage({
                type: 'error',
                error: error instanceof Error ? error.message : t('bg_cmd_replay_failed'),
              });
            }
            break;
          }

          default:
            return port.postMessage({ type: 'error', error: t('errors_cmd_unknown', [message.type]) });
        }
      } catch (error) {
        console.error('Error handling port message:', error);
        port.postMessage({
          type: 'error',
          error: error instanceof Error ? error.message : t('errors_unknown'),
        });
      }
    });

    port.onDisconnect.addListener(() => {
      const disconnectedTabId = portToTabId.get(port);
      logger.info('Side panel disconnected for tab:', disconnectedTabId);
      
      if (disconnectedTabId) {
        // Don't immediately cancel the executor - the side panel might reconnect
        // Only clean up the port references
        portToTabId.delete(port);
        tabPorts.delete(disconnectedTabId);
        
        // Set a timeout to cancel the executor only if no reconnection happens
        // This allows for transient disconnections during navigation/tab switches
        // Increased to 5 seconds to accommodate slower devices and network issues
        setTimeout(() => {
          // Check if a new port has connected for this tab
          const currentPort = tabPorts.get(disconnectedTabId);
          if (!currentPort) {
            // No reconnection happened - user likely closed the side panel
            logger.info('No reconnection for tab', disconnectedTabId, '- cancelling executor');
            const executor = tabExecutors.get(disconnectedTabId);
            if (executor) {
              executor.cancel();
            }
          } else {
            logger.info('Side panel reconnected for tab', disconnectedTabId, '- continuing execution');
          }
        }, 5000); // Wait 5 seconds for reconnection (increased from 2s for slower devices)
      }
    });
  }
});

async function setupExecutor(taskId: string, task: string, browserContext: BrowserContext, tabId: number) {
  const providers = await llmProviderStore.getAllProviders();
  // if no providers, need to display the options page
  if (Object.keys(providers).length === 0) {
    throw new Error(t('bg_setup_noApiKeys'));
  }

  // Clean up any legacy validator settings for backward compatibility
  await agentModelStore.cleanupLegacyValidatorSettings();

  const agentModels = await agentModelStore.getAllAgentModels();
  // verify if every provider used in the agent models exists in the providers
  for (const agentModel of Object.values(agentModels)) {
    if (!providers[agentModel.provider]) {
      throw new Error(t('bg_setup_noProvider', [agentModel.provider]));
    }
  }

  const navigatorModel = agentModels[AgentNameEnum.Navigator];
  if (!navigatorModel) {
    throw new Error(t('bg_setup_noNavigatorModel'));
  }
  // Log the provider config being used for the navigator
  const navigatorProviderConfig = providers[navigatorModel.provider];
  const navigatorLLM = createChatModel(navigatorProviderConfig, navigatorModel);

  let plannerLLM: BaseChatModel | null = null;
  const plannerModel = agentModels[AgentNameEnum.Planner];
  if (plannerModel) {
    // Log the provider config being used for the planner
    const plannerProviderConfig = providers[plannerModel.provider];
    plannerLLM = createChatModel(plannerProviderConfig, plannerModel);
  }

  // Apply firewall settings to browser context
  const firewall = await firewallStore.getFirewall();
  if (firewall.enabled) {
    browserContext.updateConfig({
      allowedUrls: firewall.allowList,
      deniedUrls: firewall.denyList,
    });
  } else {
    browserContext.updateConfig({
      allowedUrls: [],
      deniedUrls: [],
    });
  }

  const generalSettings = await generalSettingsStore.getSettings();
  browserContext.updateConfig({
    minimumWaitPageLoadTime: generalSettings.minWaitPageLoad / 1000.0,
    displayHighlights: generalSettings.displayHighlights,
  });

  const executor = new Executor(task, taskId, browserContext, navigatorLLM, {
    plannerLLM: plannerLLM ?? navigatorLLM,
    agentOptions: {
      maxSteps: generalSettings.maxSteps,
      maxFailures: generalSettings.maxFailures,
      maxActionsPerStep: generalSettings.maxActionsPerStep,
      useVision: generalSettings.useVision,
      useVisionForPlanner: true,
      planningInterval: generalSettings.planningInterval,
    },
    generalSettings: generalSettings,
  });

  return executor;
}

// Track which tabs are part of the same task session (for multi-tab event broadcasting)
const taskSessionTabs = new Map<number, Set<number>>(); // originalTabId -> Set of related tab IDs

// Update subscribeToExecutorEvents to broadcast to all related tabs
async function subscribeToExecutorEvents(executor: Executor, tabId: number) {
  // Clear previous event listeners to prevent multiple subscriptions
  executor.clearExecutionEvents();

  // Initialize task session tracking for this tab
  if (!taskSessionTabs.has(tabId)) {
    taskSessionTabs.set(tabId, new Set([tabId]));
  }

  // Subscribe to new events
  executor.subscribeExecutionEvents(async event => {
    try {
      // Get all tabs that are part of this task session
      const relatedTabs = taskSessionTabs.get(tabId) || new Set([tabId]);
      
      // Get the current active tab from the browser context
      const browserContext = tabBrowserContexts.get(tabId);
      if (browserContext) {
        const currentTabId = (browserContext as any)._currentTabId;
        if (currentTabId && currentTabId !== tabId) {
          // Agent has switched to a new tab - add it to the session
          relatedTabs.add(currentTabId);
          taskSessionTabs.set(tabId, relatedTabs);
          logger.info(`Added tab ${currentTabId} to task session for original tab ${tabId}`);
        }
      }
      
      // Broadcast event to all related tabs
      let sentCount = 0;
      for (const relatedTabId of relatedTabs) {
        const port = tabPorts.get(relatedTabId);
        if (port) {
          try {
            port.postMessage(event);
            sentCount++;
          } catch (portError) {
            logger.warning(`Failed to send event to tab ${relatedTabId}:`, portError);
            // Remove dead port from related tabs
            relatedTabs.delete(relatedTabId);
          }
        }
      }
      
      if (sentCount === 0) {
        logger.info(`No active ports found for task session (original tab: ${tabId}), event not sent:`, event.state);
        // CRITICAL: Save event to storage so it's available when side panel reopens
        // This ensures messages aren't lost when side panel is closed during task execution
        try {
          const { createChatHistoryStorage } = await import('@extension/storage');
          const chatStore = createChatHistoryStorage(tabId);
          
          // Get or create session for this task
          const sessions = await chatStore.getSessionsMetadata();
          let sessionId: string;
          
          if (sessions.length > 0) {
            // Use most recent session
            const sortedSessions = sessions.sort((a, b) => b.createdAt - a.createdAt);
            sessionId = sortedSessions[0].id;
          } else {
            // Create new session
            const taskId = await executor.getCurrentTaskId();
            const session = await chatStore.createSession(taskId);
            sessionId = session.id;
            logger.info(`Created new session ${sessionId} for background event storage`);
          }
          
          // Convert event to chat message and save
          if (event.data?.details) {
            const message = {
              actor: event.actor === Actors.SYSTEM ? Actors.SYSTEM : Actors.NAVIGATOR,
              content: event.data.details,
              timestamp: event.timestamp || Date.now(),
              messageType: event.state.includes('thinking') ? 'thinking' as const : 
                          event.state.includes('reasoning') ? 'thinking' as const : 'assistant' as const
            };
            
            await chatStore.addMessage(sessionId, message);
            logger.info(`Saved event to storage for closed side panel: ${event.state}`);
          }
        } catch (storageError) {
          logger.error('Failed to save event to storage:', storageError);
        }
      } else {
        logger.debug(`Event ${event.state} broadcast to ${sentCount} tab(s) in session`);
      }
    } catch (error) {
      logger.error('Failed to send message to side panel:', error);
      // Try to send error event to all related tabs
      try {
        const relatedTabs = taskSessionTabs.get(tabId) || new Set([tabId]);
        for (const relatedTabId of relatedTabs) {
          const port = tabPorts.get(relatedTabId);
          if (port) {
            port.postMessage({
              type: EventType.EXECUTION,
              actor: Actors.SYSTEM,
              state: ExecutionState.TASK_FAIL,
              timestamp: Date.now(),
              data: { details: 'Connection error: ' + (error instanceof Error ? error.message : String(error)) }
            });
          }
        }
      } catch (e) {
        logger.error('Failed to send error event:', e);
      }
    }

    // Only cleanup on final states, but DON'T delete executor from map
    // This allows follow-up tasks to work
    if (
      event.state === ExecutionState.TASK_OK ||
      event.state === ExecutionState.TASK_FAIL ||
      event.state === ExecutionState.TASK_CANCEL
    ) {
      const tabExecutor = tabExecutors.get(tabId);
      if (tabExecutor) {
        await tabExecutor.cleanup();
        // Don't delete from map - let it be reused for follow-up tasks
        logger.info(`Executor for tab ${tabId} cleaned up but kept in map for follow-up tasks`);
      }
      
      // Clean up task session tracking on task completion
      taskSessionTabs.delete(tabId);
    }
  });
}
