import { createLogger } from '../log';
import { getReadabilityContent, injectBuildDomTreeScripts } from '../browser/dom/service';
import { createChatModel } from '../agent/helper';
import { llmProviderStore, agentModelStore, AgentNameEnum } from '@extension/storage';
import type BrowserContext from '../browser/context';
import { EventType, ExecutionState, Actors } from '../agent/event/types';
import type { AgentEvent } from '../agent/event/types';

const logger = createLogger('summarize-service');

export interface SummarizePageOptions {
  tabId: number;
  sessionId: string;
  browserContext: BrowserContext;
  onProgress?: (message: string) => void;
}

export interface SummarizePageResult {
  summary: string;
  sessionId: string;
  event: AgentEvent;
}

/**
 * Summarize the current page by scraping content and sending to LLM
 * This is a standalone pipeline that bypasses the multi-agent executor
 */
export async function summarizePage(options: SummarizePageOptions): Promise<SummarizePageResult> {
  const { tabId, sessionId, browserContext, onProgress } = options;

  // Step 1: Validate model configuration
  logger.info('summarize_page: Validating model...');

  // Check if user is authenticated
  const authResult = await chrome.storage.local.get(['userId', 'isAuthenticated']);
  const isUserAuthenticated = authResult.isAuthenticated === true && authResult.userId;

  let providers = await llmProviderStore.getAllProviders();
  let agentModels = await agentModelStore.getAllAgentModels();

  // If user is authenticated and no providers configured, use default API keys
  if (isUserAuthenticated && Object.keys(providers).length === 0) {
    logger.info('[summarize] Using default API keys for authenticated user');

    // Create default provider configuration with your API key
    const defaultProvider = {
      name: 'OpenAI (Default)',
      type: 'openai' as any,
      apiKey: import.meta.env.VITE_DEFAULT_OPENAI_API_KEY || '', // Your API key from env
      modelNames: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo'],
      createdAt: Date.now(),
    };

    providers = {
      'openai-default': defaultProvider,
    };

    // Create default agent models using gpt-4o-mini
    agentModels = {
      [AgentNameEnum.Navigator]: {
        provider: 'openai-default',
        modelName: 'gpt-4o-mini',
        parameters: {
          temperature: 0.1,
          maxTokens: 4096,
        },
      },
    };
  }

  let modelCfg = agentModels[AgentNameEnum.Navigator];
  if (!modelCfg) modelCfg = agentModels[AgentNameEnum.Planner];

  if (!modelCfg) {
    throw new Error('No models configured. Configure Navigator or Planner in settings.');
  }

  const providerCfg = providers[modelCfg.provider];
  if (!providerCfg || !providerCfg.apiKey || providerCfg.apiKey.trim() === '') {
    throw new Error(`API key missing for ${modelCfg.provider}. Add it in settings.`);
  }

  // Step 2: Get tab info and validate URL
  const tabInfo = await chrome.tabs.get(tabId);
  const url = tabInfo.url || '';

  // Check for restricted URLs
  if (
    url.startsWith('chrome://') ||
    url.startsWith('chrome-extension://') ||
    url.includes('chrome.google.com/webstore')
  ) {
    throw new Error('Cannot summarize Chrome pages. Try a regular webpage.');
  }

  if (!url || url === 'about:blank') {
    throw new Error('No valid page loaded. Navigate to a webpage first.');
  }

  // Step 3: Scrape page content with fallback chain
  logger.info('summarize_page: Scraping...');
  onProgress?.('Scraping page...');

  await browserContext.getPageForTab(tabId);

  let extractedTitle = '';
  let extractedText = '';
  let method = '';

  // Try Readability
  try {
    await injectBuildDomTreeScripts(tabId);
    const r = await getReadabilityContent(tabId);
    if (r && r.textContent && r.textContent.trim().length > 100) {
      extractedTitle = r.title || tabInfo.title || 'Untitled';
      extractedText = r.textContent;
      method = 'Readability';
      logger.info('Extracted via Readability');
    }
  } catch (e) {
    logger.warning('Readability failed:', e);
  }

  // Try Markdown
  if (!extractedText || extractedText.trim().length < 100) {
    try {
      const { getMarkdownContent } = await import('../browser/dom/service');
      const md = await getMarkdownContent(tabId);
      if (md && md.trim().length > 100) {
        extractedTitle = tabInfo.title || 'Untitled';
        extractedText = md;
        method = 'Markdown';
        logger.info('Extracted via Markdown');
      }
    } catch (e) {
      logger.warning('Markdown failed:', e);
    }
  }

  // Try DOM text
  if (!extractedText || extractedText.trim().length < 100) {
    try {
      const page = await browserContext.getCurrentPage();
      const state = await page.getState(false, false, true);
      const domText = state.elementTree.getAllTextTillNextClickableElement();
      if (domText && domText.trim().length > 100) {
        extractedTitle = tabInfo.title || 'Untitled';
        extractedText = domText;
        method = 'DOM';
        logger.info('Extracted via DOM');
      }
    } catch (e) {
      logger.warning('DOM failed:', e);
    }
  }

  if (!extractedText || extractedText.trim().length < 100) {
    throw new Error('Could not extract content. Page may be empty or require login.');
  }

  // Truncate
  if (extractedText.length > 15000) {
    extractedText = extractedText.substring(0, 15000) + '\n[Truncated...]';
  }

  // Step 4: Extract structured context and metadata
  logger.info(`Generating summary (${method}, ${extractedText.length} chars)...`);
  onProgress?.('Generating summary...');

  let structuredContext: unknown = null;
  let metaDesc: string | undefined;
  let topHeadings: string[] | undefined;
  try {
    const hostname = new URL(url).hostname;
    // Generic meta + headings for any site
    const metaRes = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const meta = document.querySelector(
          'meta[name="description"], meta[property="og:description"]',
        ) as HTMLMetaElement | null;
        const headings = Array.from(document.querySelectorAll('h1,h2,h3'))
          .slice(0, 30)
          .map(h => (h.textContent || '').trim())
          .filter(Boolean);
        return { metaDesc: meta?.content || '', headings };
      },
    });
    metaDesc = metaRes[0]?.result?.metaDesc;
    topHeadings = metaRes[0]?.result?.headings;

    // YouTube home/feed structured scrape to avoid generic summaries
    if (hostname.includes('youtube.com')) {
      const ytRes = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
          try {
            const items = Array.from(document.querySelectorAll('ytd-rich-item-renderer')).slice(0, 24);
            const videos = items
              .map(el => {
                const titleEl = el.querySelector('#video-title') as HTMLElement | null;
                const channelEl = el.querySelector('ytd-channel-name a') as HTMLAnchorElement | null;
                const metaLine = el.querySelector('#metadata-line') as HTMLElement | null;
                const views = metaLine?.textContent?.match(/([\d,.]+)\s+views/i)?.[1] || null;
                const timeAgo = metaLine?.textContent?.match(/(\d+\s+\w+\s+ago)/i)?.[1] || null;
                const badge = (el.querySelector('ytd-badge-supported-renderer')?.textContent || '').trim() || null;
                const isShort = !!el.querySelector('ytd-reel-shelf-renderer');
                return {
                  title: (titleEl?.textContent || '').trim(),
                  channel: (channelEl?.textContent || '').trim(),
                  views,
                  timeAgo,
                  badge,
                  isShort,
                };
              })
              .filter(v => v.title);
            const chips = Array.from(
              document.querySelectorAll('#chips ytd-feed-filter-chip-bar-renderer yt-chip-cloud-chip-renderer span'),
            )
              .slice(0, 20)
              .map(el => (el.textContent || '').trim())
              .filter(Boolean);
            return { chips, videos };
          } catch (e) {
            return null;
          }
        },
      });
      structuredContext = ytRes[0]?.result || null;
    }
  } catch (e) {
    logger.warning('Structured/meta extraction failed:', e);
  }

  // Step 5: Build prompt
  const promptParts: string[] = [
    'You are a helpful assistant. Provide a concise summary of the actual content on this web page.',
    '',
    `URL: ${url}`,
    `Title: ${extractedTitle}`,
  ];
  if (metaDesc && metaDesc.trim().length > 0) {
    promptParts.push('', 'Meta description:', metaDesc);
  }
  if (topHeadings && topHeadings.length > 0) {
    promptParts.push('', 'Top headings:', topHeadings.slice(0, 15).join(' | '));
  }
  if (structuredContext) {
    const structuredStr = JSON.stringify(structuredContext).slice(0, 4000);
    promptParts.push('', 'Structured context (from DOM):', structuredStr);
  }
  promptParts.push(
    '',
    'CRITICAL INSTRUCTIONS:',
    '- Write a SHORT, FOCUSED paragraph (3-5 sentences maximum)',
    '- Summarize the ACTUAL CONTENT the user is reading/viewing - NOT the interface, buttons, or features',
    '- IGNORE: buttons, navigation menus, "Skip to", "Chat with expert", notifications count, UI prompts, calls-to-action',
    '- FOCUS ON: the actual posts, articles, videos, products, or information being displayed',
    '- For social feeds (LinkedIn, Twitter, etc.): describe what the POSTS are about (topics, who posted, key messages)',
    '- For articles: summarize the main points and arguments',
    '- For product pages: describe the actual product, not the purchase buttons',
    '- If you cannot find meaningful content (only UI elements visible), say "The page shows mostly interface elements without substantial content visible."',
    "- Be specific about the actual information/content, not the website's features",
    '',
    'Page content:',
    extractedText,
  );
  const prompt = promptParts.join('\n');

  // Step 6: Generate summary with LLM
  let summary: string;
  try {
    const llm = createChatModel(providerCfg, modelCfg);
    const response = await llm.invoke([{ role: 'user', content: prompt } as any]);
    summary = (response as any)?.content ?? String(response);

    if (!summary || summary.trim().length === 0) {
      throw new Error('LLM returned empty');
    }

    logger.info('Summary generated');
  } catch (llmError) {
    const errorMsg = llmError instanceof Error ? llmError.message : String(llmError);
    logger.error('LLM failed:', errorMsg);

    if (errorMsg.includes('API key') || errorMsg.includes('401')) {
      throw new Error('API key invalid. Check settings.');
    } else if (errorMsg.includes('rate limit') || errorMsg.includes('429')) {
      throw new Error('Rate limit. Try again later.');
    } else if (errorMsg.includes('timeout')) {
      throw new Error('Timeout. Check connection.');
    } else {
      throw new Error(`Failed: ${errorMsg}`);
    }
  }

  // Step 7: Build final event
  const event: AgentEvent = {
    type: EventType.EXECUTION,
    actor: Actors.SYSTEM,
    state: ExecutionState.TASK_OK,
    timestamp: Date.now(),
    data: {
      taskId: sessionId,
      step: 2,
      maxSteps: 2,
      details: summary,
      messageType: 'final',
      isFinalAnswer: true,
      source: 'summarize', // Custom field for UI to detect summarize pipeline
    },
  };

  logger.info('summarize_page: Complete');
  return { summary, sessionId, event };
}

/**
 * Cleanup browser context after summarization
 */
export async function cleanupAfterSummarize(browserContext: BrowserContext, tabId: number): Promise<void> {
  try {
    const page = await browserContext.getCurrentPage();
    await page.removeHighlight();
    await browserContext.detachPage(tabId);
    logger.info('Cleaned up browser context after summarization');
  } catch (cleanupError) {
    logger.warning('Cleanup failed (non-critical):', cleanupError);
  }
}
