/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly USE_MOCK: string
  readonly OPENAI_API_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
