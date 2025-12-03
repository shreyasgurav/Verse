/**
 * Universal Forms Background Feature Handlers
 */

import { agentModelStore, AgentNameEnum, llmProviderStore, ProviderTypeEnum } from '@extension/storage';
import { createChatModel } from '../../agent/helper';
import { createLogger } from '../../log';
import type { FeatureMessageHandler } from '../types';
import { retrieveRelevantMemories, formatMemoriesForPrompt } from '../../services/memoryRetrieval';

const logger = createLogger('universal-forms');

async function handleFillUniversalFormField(message: any, sendResponse: (response?: any) => void) {
  try {
    const { field } = message;

    if (!field || !field.context) {
      sendResponse({ ok: false, error: 'Invalid field data' });
      return;
    }

    // Get LLM settings from user configuration
    const providers = await llmProviderStore.getAllProviders();
    const agentModels = await agentModelStore.getAllAgentModels();

    // Check if user has configured API keys
    if (Object.keys(providers).length === 0) {
      sendResponse({ ok: false, error: 'No API keys configured. Please configure your API keys in Settings.' });
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

    // Retrieve relevant memories for this field (uses internal API key)
    logger.info('Searching memories for field:', field.context);
    const relevantMemories = await retrieveRelevantMemories(field.context, 3, 0.2);
    const memoryContext = formatMemoriesForPrompt(relevantMemories);

    if (relevantMemories.length > 0) {
      logger.info(`✅ Found ${relevantMemories.length} relevant memories for field:`, field.context);
      relevantMemories.forEach((m, i) => {
        logger.info(`  ${i + 1}. [${m.similarity.toFixed(3)}] ${m.content.substring(0, 60)}...`);
      });
    } else {
      logger.info('❌ No relevant memories found for field:', field.context);
    }

    // Build context-rich prompt
    let prompt = '';
    if (memoryContext) {
      prompt = `${memoryContext}You are filling out a form field. Use the information from your memories above if relevant. Provide an appropriate answer.\n\n`;
    } else {
      prompt = `You are filling out a form field. Provide an appropriate answer.\n\n`;
    }
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
