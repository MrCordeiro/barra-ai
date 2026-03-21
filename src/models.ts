export type Provider = 'openai' | 'anthropic' | 'gemini';

export const LLM_MODELS = Object.freeze({
  GPT_52: { name: 'GPT-5.2', value: 'gpt-5.2', provider: 'openai' },
  GPT_51: { name: 'GPT-5.1', value: 'gpt-5.1', provider: 'openai' },
  GPT_5: { name: 'GPT-5', value: 'gpt-5', provider: 'openai' },
  GPT_5_MINI: { name: 'GPT-5 Mini', value: 'gpt-5-mini', provider: 'openai' },
  GPT_5_NANO: { name: 'GPT-5 Nano', value: 'gpt-5-nano', provider: 'openai' },
  GPT_4O: { name: 'GPT-4o', value: 'gpt-4o', provider: 'openai' },
  GPT_4O_MINI: {
    name: 'GPT-4o Mini',
    value: 'gpt-4o-mini',
    provider: 'openai',
  },
  GPT_41: { name: 'GPT-4.1', value: 'gpt-4.1', provider: 'openai' },
  GPT_41_MINI: {
    name: 'GPT-4.1 Mini',
    value: 'gpt-4.1-mini',
    provider: 'openai',
  },
  GPT_41_NANO: {
    name: 'GPT-4.1 Nano',
    value: 'gpt-4.1-nano',
    provider: 'openai',
  },
  GPT_35_TURBO: {
    name: 'GPT-3.5 Turbo',
    value: 'gpt-3.5-turbo',
    provider: 'openai',
  },
  CLAUDE_OPUS_4_6: {
    name: 'Claude Opus 4.6',
    value: 'claude-opus-4-6',
    provider: 'anthropic',
  },
  CLAUDE_SONNET_4_6: {
    name: 'Claude Sonnet 4.6',
    value: 'claude-sonnet-4-6',
    provider: 'anthropic',
  },
  CLAUDE_HAIKU_4_5: {
    name: 'Claude Haiku 4.5',
    value: 'claude-haiku-4-5-20251001',
    provider: 'anthropic',
  },
  GEMINI_25_PRO: {
    name: 'Gemini 2.5 Pro',
    value: 'gemini-2.5-pro',
    provider: 'gemini',
  },
  GEMINI_20_FLASH: {
    name: 'Gemini 2.0 Flash',
    value: 'gemini-2.0-flash',
    provider: 'gemini',
  },
  GEMINI_20_FLASH_LITE: {
    name: 'Gemini 2.0 Flash Lite',
    value: 'gemini-2.0-flash-lite',
    provider: 'gemini',
  },
  GEMINI_15_PRO: {
    name: 'Gemini 1.5 Pro',
    value: 'gemini-1.5-pro',
    provider: 'gemini',
  },
  GEMINI_15_FLASH: {
    name: 'Gemini 1.5 Flash',
    value: 'gemini-1.5-flash',
    provider: 'gemini',
  },
} as const);

export const DEFAULT_LLM_MODEL = LLM_MODELS.GPT_4O_MINI;

export const LLM_MODEL_OPTIONS = Object.values(LLM_MODELS);

export function getProviderForModel(modelValue: string): Provider {
  const model = LLM_MODEL_OPTIONS.find(m => m.value === modelValue);
  return (model?.provider ?? 'openai') as Provider;
}

/**
 * Per-provider UI and storage metadata.
 * Adding a new provider here is the only models.ts change needed beyond
 * declaring the Provider type and its LLM_MODELS entries.
 */
export const PROVIDER_CONFIG = {
  openai: {
    label: 'OpenAI',
    storageKey: 'openaiApiKey',
    helpUrl: 'https://platform.openai.com/api-keys',
    helpLabel: 'OpenAI dashboard',
  },
  anthropic: {
    label: 'Anthropic',
    storageKey: 'anthropicApiKey',
    helpUrl: 'https://console.anthropic.com/settings/keys',
    helpLabel: 'Anthropic Console',
  },
  gemini: {
    label: 'Google Gemini',
    storageKey: 'geminiApiKey',
    helpUrl: 'https://aistudio.google.com/app/apikey',
    helpLabel: 'Google AI Studio',
  },
} as const satisfies Record<
  Provider,
  { label: string; storageKey: string; helpUrl: string; helpLabel: string }
>;

/** All provider keys, typed as Provider[]. Avoids repeated `Object.keys(PROVIDER_CONFIG) as Provider[]` casts. */
export const PROVIDERS = Object.keys(PROVIDER_CONFIG) as Provider[];
