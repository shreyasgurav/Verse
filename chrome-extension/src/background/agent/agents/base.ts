import type { z } from 'zod';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { AgentContext, AgentOutput } from '../types';
import type { BasePrompt } from '../prompts/base';
import type { BaseMessage } from '@langchain/core/messages';
import { createLogger } from '@src/background/log';
import type { Action } from '../actions/builder';
import { convertInputMessages, extractJsonFromModelOutput, removeThinkTags } from '../messages/utils';
import { isAbortedError, ResponseParseError } from './errors';
import { ProviderTypeEnum } from '@extension/storage';
import { trackUsage, checkUserHasCredits } from '../../services/creditTracker';

const logger = createLogger('agent');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CallOptions = Record<string, any>;

// Update options to use Zod schema
export interface BaseAgentOptions {
  chatLLM: BaseChatModel;
  context: AgentContext;
  prompt: BasePrompt;
  provider?: string;
}
export interface ExtraAgentOptions {
  id?: string;
  toolCallingMethod?: string;
  callOptions?: CallOptions;
}

/**
 * Base class for all agents
 * @param T - The Zod schema for the model output
 * @param M - The type of the result field of the agent output
 */
export abstract class BaseAgent<T extends z.ZodType, M = unknown> {
  protected id: string;
  protected chatLLM: BaseChatModel;
  protected prompt: BasePrompt;
  protected context: AgentContext;
  protected actions: Record<string, Action> = {};
  protected modelOutputSchema: T;
  protected toolCallingMethod: string | null;
  protected chatModelLibrary: string;
  protected modelName: string;
  protected provider: string;
  protected withStructuredOutput: boolean;
  protected callOptions?: CallOptions;
  protected modelOutputToolName: string;
  declare ModelOutput: z.infer<T>;

  constructor(modelOutputSchema: T, options: BaseAgentOptions, extraOptions?: Partial<ExtraAgentOptions>) {
    // base options
    this.modelOutputSchema = modelOutputSchema;
    this.chatLLM = options.chatLLM;
    this.prompt = options.prompt;
    this.context = options.context;
    this.provider = options.provider || '';
    // TODO: fix this, the name is not correct in production environment
    this.chatModelLibrary = this.chatLLM.constructor.name;
    this.modelName = this.getModelName();
    this.withStructuredOutput = this.setWithStructuredOutput();
    // extra options
    this.id = extraOptions?.id || 'agent';
    this.toolCallingMethod = this.setToolCallingMethod(extraOptions?.toolCallingMethod);
    this.callOptions = extraOptions?.callOptions;
    this.modelOutputToolName = `${this.id}_output`;
  }

  // Set the model name
  private getModelName(): string {
    if ('modelName' in this.chatLLM) {
      return this.chatLLM.modelName as string;
    }
    if ('model_name' in this.chatLLM) {
      return this.chatLLM.model_name as string;
    }
    if ('model' in this.chatLLM) {
      return this.chatLLM.model as string;
    }
    return 'Unknown';
  }

  // Set the tool calling method
  private setToolCallingMethod(toolCallingMethod?: string): string | null {
    if (toolCallingMethod === 'auto') {
      switch (this.chatModelLibrary) {
        case 'ChatGoogleGenerativeAI':
          return null;
        case 'ChatOpenAI':
        case 'AzureChatOpenAI':
        case 'ChatGroq':
        case 'ChatXAI':
          return 'function_calling';
        default:
          return null;
      }
    }
    return toolCallingMethod || null;
  }

  // Check if model is a Llama model (only for Llama-specific handling)
  private isLlamaModel(modelName: string): boolean {
    return modelName.includes('Llama-4') || modelName.includes('Llama-3.3') || modelName.includes('llama-3.3');
  }

  // Set whether to use structured output based on the model name
  private setWithStructuredOutput(): boolean {
    if (this.modelName === 'deepseek-reasoner' || this.modelName === 'deepseek-r1') {
      return false;
    }

    // Llama API models don't support json_schema response format
    if (this.provider === ProviderTypeEnum.Llama || this.isLlamaModel(this.modelName)) {
      logger.debug(`[${this.modelName}] Llama API doesn't support structured output, using manual JSON extraction`);
      return false;
    }

    return true;
  }

  async invoke(inputMessages: BaseMessage[]): Promise<this['ModelOutput']> {
    // Check user credits before making API call (if using default API keys)
    const isUsingDefaultKeys = await this.isUsingDefaultApiKeys();
    let userId: string | null = null;

    if (isUsingDefaultKeys) {
      // Get current user ID from storage
      const authData = await chrome.storage.local.get(['userId', 'isAuthenticated']);
      if (authData.isAuthenticated && authData.userId) {
        userId = authData.userId;

        // Check if user has remaining credits
        const hasCredits = await checkUserHasCredits(userId);
        if (!hasCredits) {
          const error = new Error(
            'You have used all your free credits ($0.50). Please configure your own API keys in Settings to continue using Verse.',
          );
          logger.error('[CreditTracker] User out of credits:', userId);
          throw error;
        }
      }
    }

    // Use structured output
    if (this.withStructuredOutput) {
      logger.debug(`[${this.modelName}] Preparing structured output call with schema:`, {
        schemaName: this.modelOutputToolName,
        messageCount: inputMessages.length,
        modelProvider: this.provider,
      });

      const structuredLlm = this.chatLLM.withStructuredOutput(this.modelOutputSchema, {
        includeRaw: true,
        name: this.modelOutputToolName,
      });

      try {
        logger.debug(`[${this.modelName}] Invoking LLM with structured output...`);
        const response = await structuredLlm.invoke(inputMessages, {
          signal: this.context.controller.signal,
          ...this.callOptions,
        });

        logger.debug(`[${this.modelName}] LLM response received:`, {
          hasParsed: !!response.parsed,
          hasRaw: !!response.raw,
          rawContent: response.raw?.content?.slice(0, 500) + (response.raw?.content?.length > 500 ? '...' : ''),
        });

        // Track usage if using default keys and we have usage data (non-blocking)
        if (isUsingDefaultKeys && userId && response.raw) {
          this.trackTokenUsage(userId, response.raw).catch(err =>
            logger.warning('[CreditTracker] Failed to track usage (non-blocking):', err),
          );
        }

        if (response.parsed) {
          logger.debug(`[${this.modelName}] Successfully parsed structured output`);
          return response.parsed;
        }
        logger.error('Failed to parse response', response);
        throw new Error('Could not parse response with structured output');
      } catch (error) {
        if (isAbortedError(error)) {
          throw error;
        }
        logger.error(`[${this.modelName}] LLM call failed with error:`, error);
        const errorMessage = `Failed to invoke ${this.modelName} with structured output: \n${error instanceof Error ? error.message : String(error)}`;
        throw new Error(errorMessage);
      }
    }

    // Without structured output support, need to extract JSON from model output manually
    logger.debug(`[${this.modelName}] Using manual JSON extraction fallback method`);
    const convertedInputMessages = convertInputMessages(inputMessages, this.modelName);

    try {
      const response = await this.chatLLM.invoke(convertedInputMessages, {
        signal: this.context.controller.signal,
        ...this.callOptions,
      });

      // Track usage for manual extraction mode if using default keys (non-blocking)
      if (isUsingDefaultKeys && userId && response) {
        this.trackTokenUsage(userId, response).catch(err =>
          logger.warning('[CreditTracker] Failed to track usage (non-blocking):', err),
        );
      }

      if (typeof response.content === 'string') {
        response.content = removeThinkTags(response.content);
        try {
          const extractedJson = extractJsonFromModelOutput(response.content);
          const parsed = this.validateModelOutput(extractedJson);
          if (parsed) {
            return parsed;
          }
        } catch (error) {
          logger.error(`[${this.modelName}] Failed to extract JSON from response:`, error);
          const errorMessage = `Failed to extract JSON from response: ${error}`;
          throw new Error(errorMessage);
        }
      }
    } catch (error) {
      logger.error(`[${this.modelName}] LLM call failed in manual extraction mode:`, error);
      throw error;
    }
    const errorMessage = `Failed to parse response from ${this.modelName}`;
    logger.error(errorMessage);
    throw new ResponseParseError('Could not parse response');
  }

  /**
   * Check if the current agent is using default API keys
   */
  private async isUsingDefaultApiKeys(): Promise<boolean> {
    // Check if the provider is 'openai-default' which means using default keys
    return this.provider === 'openai-default';
  }

  /**
   * Track token usage after an API call
   */
  private async trackTokenUsage(userId: string, response: any): Promise<void> {
    try {
      // Extract usage information from response
      // LangChain responses include usage_metadata or response_metadata
      let inputTokens = 0;
      let outputTokens = 0;

      // Try response_metadata.usage first (OpenAI format)
      if (response.response_metadata?.usage) {
        inputTokens = response.response_metadata.usage.prompt_tokens || 0;
        outputTokens = response.response_metadata.usage.completion_tokens || 0;
      }
      // Try usage_metadata (newer LangChain format)
      else if (response.usage_metadata) {
        inputTokens = response.usage_metadata.input_tokens || 0;
        outputTokens = response.usage_metadata.output_tokens || 0;
      }
      // Try direct usage field
      else if (response.usage) {
        inputTokens = response.usage.prompt_tokens || response.usage.input_tokens || 0;
        outputTokens = response.usage.completion_tokens || response.usage.output_tokens || 0;
      }

      if (inputTokens > 0 || outputTokens > 0) {
        await trackUsage(userId, this.modelName, inputTokens, outputTokens);
      } else {
        logger.warning('[CreditTracker] No token usage found in response:', {
          hasResponseMetadata: !!response.response_metadata,
          hasUsageMetadata: !!response.usage_metadata,
          hasUsage: !!response.usage,
        });
      }
    } catch (error) {
      logger.error('[CreditTracker] Failed to track usage:', error);
      // Don't throw - tracking errors shouldn't break the agent
    }
  }

  // Execute the agent and return the result
  abstract execute(): Promise<AgentOutput<M>>;

  // Helper method to validate metadata
  protected validateModelOutput(data: unknown): this['ModelOutput'] | undefined {
    if (!this.modelOutputSchema || !data) return undefined;
    try {
      return this.modelOutputSchema.parse(data);
    } catch (error) {
      logger.error('validateModelOutput', error);
      throw new ResponseParseError('Could not validate model output');
    }
  }
}
