export const LLM_MODELS = Object.freeze({
  GPT_52: { name: 'GPT-5.2', value: 'gpt-5.2' },
  GPT_51: { name: 'GPT-5.1', value: 'gpt-5.1' },
  GPT_5: { name: 'GPT-5', value: 'gpt-5' },
  GPT_5_MINI: { name: 'GPT-5 Mini', value: 'gpt-5-mini' },
  GPT_5_NANO: { name: 'GPT-5 Nano', value: 'gpt-5-nano' },
  GPT_4O: { name: 'GPT-4o', value: 'gpt-4o' },
  GPT_4O_MINI: { name: 'GPT-4o Mini', value: 'gpt-4o-mini' },
  GPT_41: { name: 'GPT-4.1', value: 'gpt-4.1' },
  GPT_41_MINI: { name: 'GPT-4.1 Mini', value: 'gpt-4.1-mini' },
  GPT_41_NANO: { name: 'GPT-4.1 Nano', value: 'gpt-4.1-nano' },
  GPT_35_TURBO: { name: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo' },
} as const);

export const DEFAULT_LLM_MODEL = LLM_MODELS.GPT_4O_MINI;

export const LLM_MODEL_OPTIONS = Object.values(LLM_MODELS);
