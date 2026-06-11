/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AI_BASE_URL: string
  readonly VITE_AI_MODEL: string
  readonly VITE_AI_API_KEY: string
  readonly VITE_AI_BASE_URL_LOCKED: string
  // Vite 内置变量
  readonly DEV: boolean
  readonly PROD: boolean
  readonly MODE: string
  readonly BASE_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
