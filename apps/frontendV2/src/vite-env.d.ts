/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CLERK_PUBLISHABLE_KEY?: string
  readonly NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?: string
  readonly VITE_CONVEX_URL?: string
  readonly NEXT_PUBLIC_CONVEX_URL?: string
  readonly VITE_DISABLE_REGISTRATION?: string
  readonly NEXT_PUBLIC_DISABLE_REGISTRATION?: string
  readonly VITE_SENTRY_DSN?: string
  readonly NEXT_PUBLIC_SENTRY_DSN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
