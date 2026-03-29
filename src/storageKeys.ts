export const STORAGE_KEYS = {
  OPENAI_API_KEY: 'openaiApiKey',
  ANTHROPIC_API_KEY: 'anthropicApiKey',
  GEMINI_API_KEY: 'geminiApiKey',
  MODEL_NAME: 'modelName',
  LOCAL_MODEL_CACHED: 'localModelCached',
  LOCAL_MODEL_ENDPOINT: 'localModelEndpoint',
  LOCAL_MODEL_ENABLED: 'localModelEnabled',
  LOCAL_MODEL_GATE_ACKNOWLEDGED: 'localModelGateAcknowledged',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

export const PROVIDER_API_KEYS: readonly StorageKey[] = [
  STORAGE_KEYS.OPENAI_API_KEY,
  STORAGE_KEYS.ANTHROPIC_API_KEY,
  STORAGE_KEYS.GEMINI_API_KEY,
];

export const MODEL_STORAGE_KEYS: readonly StorageKey[] = [
  STORAGE_KEYS.MODEL_NAME,
  STORAGE_KEYS.LOCAL_MODEL_CACHED,
  STORAGE_KEYS.LOCAL_MODEL_ENDPOINT,
];
