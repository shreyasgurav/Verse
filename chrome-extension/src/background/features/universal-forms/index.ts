/**
 * Universal Forms Background Feature Handlers
 */

import { agentModelStore, AgentNameEnum, llmProviderStore } from '@extension/storage';
import { createChatModel } from '../../agent/helper';
import { createLogger } from '../../log';
import type { FeatureMessageHandler } from '../types';

const logger = createLogger('universal-forms');

async function handleFillUniversalFormField(message: any, sendResponse: (response?: any) => void) {
  try {
    const { field } = message;

    if (!field || !field.context) {
      sendResponse({ ok: false, error: 'Invalid field data' });
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

    // Build context-rich prompt
    let prompt = `You are filling out a form field. Provide an appropriate answer.\n\n`;
    prompt += `Field Context: ${field.context}\n`;
    prompt += `Field Type: ${field.type}\n`;

    if (field.required) prompt += `Required: Yes\n`;

    if (field.constraints) {
      if (field.constraints.pattern) prompt += `Pattern: ${field.constraints.pattern}\n`;
      if (field.constraints.minLength) prompt += `Min Length: ${field.constraints.minLength}\n`;
      if (field.constraints.maxLength) prompt += `Max Length: ${field.constraints.maxLength}\n`;
      if (field.constraints.min !== undefined) prompt += `Min Value: ${field.constraints.min}\n`;
      if (field.constraints.max !== undefined) prompt += `Max Value: ${field.constraints.max}\n`;
    }

    // Add options for choice fields
    if (field.options && field.options.length > 0) {
      prompt += `\nOptions:\n`;
      field.options.forEach((opt: string, idx: number) => {
        prompt += `${String.fromCharCode(97 + idx)}) ${opt}\n`;
      });
      prompt += `\nReturn ONLY the letter of your choice (a, b, c, etc.).\n`;
    } else {
      // Add type-specific instructions
      switch (field.type) {
        case 'email':
          prompt += `\nProvide a valid email address.\n`;
          break;
        case 'tel':
          prompt += `\nProvide a valid phone number in standard format.\n`;
          break;
        case 'number':
          prompt += `\nProvide a number${field.constraints?.min !== undefined ? ` (min: ${field.constraints.min})` : ''}${field.constraints?.max !== undefined ? ` (max: ${field.constraints.max})` : ''}.\n`;
          break;
        case 'date':
          prompt += `\nProvide a date in YYYY-MM-DD format.\n`;
          break;
        case 'time':
          prompt += `\nProvide a time in HH:MM format.\n`;
          break;
        case 'url':
          prompt += `\nProvide a valid URL starting with http:// or https://.\n`;
          break;
        case 'checkbox':
          prompt += `\nAnswer with 'yes' or 'no' to indicate if this should be checked.\n`;
          break;
        default:
          prompt += `\nProvide a brief, appropriate answer that fits the context.\n`;
      }

      if (field.constraints?.maxLength) {
        prompt += `Keep your answer under ${field.constraints.maxLength} characters.\n`;
      }
    }

    prompt += `\nAnswer:`;

    // Get answer from LLM
    const response = await chatModel.invoke(prompt);
    const answer = response.content.toString().trim();

    logger.info('Field:', field.context, 'Type:', field.type, 'Answer:', answer);

    sendResponse({ ok: true, answer });
  } catch (error) {
    logger.error('Error:', error);
    sendResponse({ ok: false, error: String(error) });
  }
}

export const universalFormsHandlers: FeatureMessageHandler[] = [
  {
    type: 'FILL_UNIVERSAL_FORM_FIELD',
    handler: (message, sender, sendResponse) => {
      handleFillUniversalFormField(message, sendResponse);
      return true; // Keep channel open for async response
    },
  },
];
