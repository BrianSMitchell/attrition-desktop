/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  readonly VITE_PRODUCTION_HOST?: string
  readonly VITE_ENVIRONMENT?: string
  readonly VITE_FORCE_DEV_MODE?: string
  readonly MODE: string
  readonly PROD: boolean
  readonly DEV: boolean
  // Add other environment variables here as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
