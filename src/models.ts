export type Provider = 'openai' | 'anthropic' | 'gemini';

import { STORAGE_KEYS } from './storageKeys';

export const LLM_MODELS = Object.freeze({
  // OpenAI — current: GPT-5.6 family (Sol/Terra/Luna tiers)
  GPT_56_SOL: { name: 'GPT-5.6 Sol', value: 'gpt-5.6-sol', provider: 'openai' },
  GPT_56_TERRA: {
    name: 'GPT-5.6 Terra',
    value: 'gpt-5.6-terra',
    provider: 'openai',
  },
  GPT_56_LUNA: {
    name: 'GPT-5.6 Luna',
    value: 'gpt-5.6-luna',
    provider: 'openai',
  },
  // OpenAI — still supported (no API shutdown date announced)
  GPT_54: { name: 'GPT-5.4', value: 'gpt-5.4', provider: 'openai' },
  GPT_52: { name: 'GPT-5.2', value: 'gpt-5.2', provider: 'openai' },
  GPT_51: { name: 'GPT-5.1', value: 'gpt-5.1', provider: 'openai' },
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
  // OpenAI — still supported, but API shutdown is scheduled:
  //   gpt-5 / gpt-5-mini / gpt-5-nano -> retiring 2026-12-11 (see platform.openai.com/docs/deprecations)
  //   gpt-4.1-nano                    -> retiring 2026-10-23
  GPT_5: { name: 'GPT-5', value: 'gpt-5', provider: 'openai' },
  GPT_5_MINI: { name: 'GPT-5 Mini', value: 'gpt-5-mini', provider: 'openai' },
  GPT_5_NANO: { name: 'GPT-5 Nano', value: 'gpt-5-nano', provider: 'openai' },
  GPT_41_NANO: {
    name: 'GPT-4.1 Nano',
    value: 'gpt-4.1-nano',
    provider: 'openai',
  },
  // Anthropic — current: Claude 5 family + Haiku 4.5
  CLAUDE_FABLE_5: {
    name: 'Claude Fable 5',
    value: 'claude-fable-5',
    provider: 'anthropic',
  },
  CLAUDE_OPUS_5: {
    name: 'Claude Opus 5',
    value: 'claude-opus-5',
    provider: 'anthropic',
  },
  CLAUDE_SONNET_5: {
    name: 'Claude Sonnet 5',
    value: 'claude-sonnet-5',
    provider: 'anthropic',
  },
  CLAUDE_HAIKU_4_5: {
    name: 'Claude Haiku 4.5',
    value: 'claude-haiku-4-5-20251001',
    provider: 'anthropic',
  },
  // Anthropic — still supported ("Active" per Anthropic's own model catalog)
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
  // Google — current: Gemini 3 family
  GEMINI_31_PRO: {
    name: 'Gemini 3.1 Pro',
    value: 'gemini-3.1-pro-preview',
    provider: 'gemini',
  },
  GEMINI_35_FLASH: {
    name: 'Gemini 3.5 Flash',
    value: 'gemini-3.5-flash',
    provider: 'gemini',
  },
  GEMINI_35_FLASH_LITE: {
    name: 'Gemini 3.5 Flash Lite',
    value: 'gemini-3.5-flash-lite',
    provider: 'gemini',
  },
  // Google — still supported (Gemini 2.5 family has no deprecation date)
  GEMINI_25_PRO: {
    name: 'Gemini 2.5 Pro',
    value: 'gemini-2.5-pro',
    provider: 'gemini',
  },
  GEMINI_25_FLASH: {
    name: 'Gemini 2.5 Flash',
    value: 'gemini-2.5-flash',
    provider: 'gemini',
  },
  GEMINI_25_FLASH_LITE: {
    name: 'Gemini 2.5 Flash Lite',
    value: 'gemini-2.5-flash-lite',
    provider: 'gemini',
  },
} as const);

export const DEFAULT_LLM_MODEL = LLM_MODELS.GPT_56_TERRA;

export const LLM_MODEL_OPTIONS = Object.values(LLM_MODELS);

export function getProviderForModel(modelValue: string): Provider {
  const model = LLM_MODEL_OPTIONS.find(m => m.value === modelValue);
  return (model?.provider ?? 'openai') as Provider;
}

/**
 * Per-provider UI and storage metadata.
 *
 * To add a new provider, add a new entry here and register it in
 * providerHandlers in src/content/ai.ts
 */
export const PROVIDER_CONFIG = {
  openai: {
    label: 'OpenAI',
    storageKey: STORAGE_KEYS.OPENAI_API_KEY,
    helpUrl: 'https://platform.openai.com/api-keys',
    helpLabel: 'OpenAI dashboard',
  },
  anthropic: {
    label: 'Anthropic',
    storageKey: STORAGE_KEYS.ANTHROPIC_API_KEY,
    helpUrl: 'https://console.anthropic.com/settings/keys',
    helpLabel: 'Anthropic Console',
  },
  gemini: {
    label: 'Google Gemini',
    storageKey: STORAGE_KEYS.GEMINI_API_KEY,
    helpUrl: 'https://aistudio.google.com/app/apikey',
    helpLabel: 'Google AI Studio',
  },
} as const satisfies Record<
  Provider,
  { label: string; storageKey: string; helpUrl: string; helpLabel: string }
>;

/** All provider keys, typed as Provider[]. Avoids repeated `Object.keys(PROVIDER_CONFIG) as Provider[]` casts. */
export const PROVIDERS = Object.keys(PROVIDER_CONFIG) as Provider[];
