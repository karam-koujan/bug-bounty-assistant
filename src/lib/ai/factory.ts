import { ResearchAI, AIProviderConfig } from './adapter';
import { OpenAIProvider } from './providers/openai';
import { AnthropicProvider } from './providers/anthropic';
import { GenericOpenAICompatibleProvider } from './providers/generic';

export type ProviderType = 'openai' | 'anthropic' | 'generic' | 'openrouter';

export function createAIProvider(provider: ProviderType, config: AIProviderConfig & { baseUrl?: string; apiPath?: string }): ResearchAI {
  switch (provider) {
    case 'openai':
      return new OpenAIProvider(config);
    case 'anthropic':
      return new AnthropicProvider(config);
    case 'generic':
      if (!config.baseUrl) {
        throw new Error('Generic provider requires baseUrl (e.g., http://localhost:11434/v1 for Ollama)');
      }
      return new GenericOpenAICompatibleProvider(config as AIProviderConfig & { baseUrl: string; apiPath?: string });
    case 'openrouter':
      if (!config.baseUrl) {
        throw new Error('OpenRouter provider requires baseUrl (e.g., https://openrouter.ai/api/v1)');
      }
      return new GenericOpenAICompatibleProvider(config as AIProviderConfig & { baseUrl: string; apiPath?: string });
    default:
      throw new Error(`Unknown AI provider: ${provider}`);
  }
}

export function getProviderFromEnv(): { provider: ProviderType; config: AIProviderConfig & { baseUrl?: string; apiPath?: string } } {
  const provider = (process.env.AI_PROVIDER as ProviderType) || 'openai';
  const apiKey = process.env.AI_API_KEY;
  const baseUrl = process.env.AI_BASE_URL;
  const apiPath = process.env.AI_API_PATH;
  const model = process.env.AI_MODEL || (provider === 'openai' ? 'gpt-4o-mini' : provider === 'anthropic' ? 'claude-3-haiku-20240307' : 'llama3.2');

  if (provider !== 'generic' && !apiKey) {
    throw new Error('AI_API_KEY environment variable is required for OpenAI/Anthropic');
  }
  if (provider === 'generic' && !baseUrl) {
    throw new Error('AI_BASE_URL environment variable is required for generic provider');
  }

  return {
    provider,
    config: { apiKey: apiKey || 'not-required', model, baseUrl, apiPath },
  };
}