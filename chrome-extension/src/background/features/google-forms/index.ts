/**
 * Google Forms Background Feature Handlers
 */

import { agentModelStore, AgentNameEnum, llmProviderStore, ProviderTypeEnum } from '@extension/storage';
import { createChatModel } from '../../agent/helper';
import { createLogger } from '../../log';
import type { FeatureMessageHandler } from '../types';
import { retrieveRelevantMemories, formatMemoriesForPrompt } from '../../services/memoryRetrieval';

const logger = createLogger('google-forms');

async function handleFillFormQuestion(message: any, sendResponse: (response?: any) => void) {
  try {
    const { form } = message;

    if (!Array.isArray(form) || form.length === 0) {
      sendResponse({ ok: false, error: 'Invalid form data' });
      return;
    }

    // Get the single question (should be first item)
    const question = form[0];
    if (!question) {
      sendResponse({ ok: false, error: 'No question provided' });
      return;
    }

    // Check if user is authenticated
    const authResult = await chrome.storage.local.get(['userId', 'isAuthenticated']);
    const isUserAuthenticated = authResult.isAuthenticated === true && authResult.userId;

    // Get LLM settings
    let providers = await llmProviderStore.getAllProviders();
    let agentModels = await agentModelStore.getAllAgentModels();

    // If user is authenticated and no providers configured, use default API keys
    if (isUserAuthenticated && Object.keys(providers).length === 0) {
      logger.info('Using default API keys for authenticated user');

      const defaultProvider = {
        name: 'OpenAI (Default)',
        type: 'openai' as any,
        apiKey: import.meta.env.VITE_DEFAULT_OPENAI_API_KEY || '',
        modelNames: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo'],
        createdAt: Date.now(),
      };

      providers = {
        'openai-default': defaultProvider,
      };

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
    } else if (Object.keys(providers).length === 0) {
      sendResponse({ ok: false, error: 'No API keys configured' });
      return;
    }

    // Get Navigator agent model configuration
    const navigatorModel = agentModels[AgentNameEnum.Navigator];
    if (!navigatorModel) {
      sendResponse({ ok: false, error: 'Navigator model not configured' });
      return;
    }

    const providerConfig = providers[navigatorModel.provider];
    if (!providerConfig) {
      sendResponse({ ok: false, error: 'Provider not found' });
      return;
    }

    // Create a chat model
    const chatModel = createChatModel(providerConfig, navigatorModel);

    // Retrieve relevant memories for this question
    const openAIKey = providerConfig.type === ProviderTypeEnum.OpenAI ? providerConfig.apiKey : undefined;
    const relevantMemories = await retrieveRelevantMemories(question.question, openAIKey, 3, 0.5);
    const memoryContext = formatMemoriesForPrompt(relevantMemories);

    if (relevantMemories.length > 0) {
      logger.info(`Found ${relevantMemories.length} relevant memories for question:`, question.question);
    }

    // Format question with lettered options
    const optionsText =
      Array.isArray(question.options) && question.options.length > 0
        ? question.options.map((opt: string, idx: number) => `(${String.fromCharCode(97 + idx)}) ${opt}`).join('\n')
        : '';

    // Build prompt based on question type
    let prompt = '';
    if (question.type === 'choice' && optionsText) {
      prompt = memoryContext
        ? `${memoryContext}You are answering a multiple choice question. Use the information from your memories above if relevant. Return ONLY the letter (a, b, c, etc.) of the best answer.\n\nQuestion: ${question.question}\n\nOptions:\n${optionsText}\n\nAnswer with only the letter:`
        : `You are answering a multiple choice question. Return ONLY the letter (a, b, c, etc.) of the best answer.\n\nQuestion: ${question.question}\n\nOptions:\n${optionsText}\n\nAnswer with only the letter:`;
    } else {
      prompt = memoryContext
        ? `${memoryContext}You are filling out a form. Use the information from your memories above if relevant. Provide a short, appropriate answer to this question.\n\nQuestion: ${question.question}\n\nAnswer (be brief and direct):`
        : `You are filling out a form. Provide a short, appropriate answer to this question.\n\nQuestion: ${question.question}\n\nAnswer (be brief and direct):`;
    }

    // Get answer from LLM
    const response = await chatModel.invoke(prompt);
    const answer = response.content.toString().trim();

    logger.info('Question:', question.question, 'Answer:', answer);

    // Return in the same format as before for compatibility
    sendResponse({
      ok: true,
      answersByIndex: [answer],
      answersByQuestion: { [question.question]: answer },
    });
  } catch (error) {
    logger.error('Error:', error);
    sendResponse({ ok: false, error: String(error) });
  }
}

export const googleFormsHandlers: FeatureMessageHandler[] = [
  {
    type: 'FILL_FORM_QUESTION',
    handler: (message, sender, sendResponse) => {
      handleFillFormQuestion(message, sendResponse);
      return true; // Keep channel open for async response
    },
  },
];
