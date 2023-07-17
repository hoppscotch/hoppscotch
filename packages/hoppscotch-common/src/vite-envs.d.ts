/// <reference types="vite/client" />

// Environment Variables Intellisense
interface ImportMetaEnv {
  readonly APP_GA_ID: string

  readonly APP_GTM_ID: string

  readonly APP_API_KEY: string
  readonly APP_AUTH_DOMAIN: string
  readonly APP_DATABASE_URL: string
  readonly APP_PROJECT_ID: string
  readonly APP_STORAGE_BUCKET: string
  readonly APP_MESSAGING_SENDER_ID: string
  readonly APP_APP_ID: string
  readonly APP_MEASUREMENT_ID: string

  readonly APP_BASE_URL: string
  readonly APP_SHORTCODE_BASE_URL: string

  readonly APP_BACKEND_GQL_URL: string
  readonly APP_BACKEND_WS_URL: string

  readonly APP_SENTRY_DSN?: string
  readonly APP_SENTRY_ENVIRONMENT?: string
  readonly APP_SENTRY_RELEASE_TAG?: string

  readonly APP_PROXYSCOTCH_ACCESS_TOKEN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
