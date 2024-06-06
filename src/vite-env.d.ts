/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly USE_MOCK: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
