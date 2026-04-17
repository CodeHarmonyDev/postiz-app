function pickFirstDefined(...values: Array<unknown>) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }

  return undefined
}

function readBoolean(value: unknown) {
  return typeof value === 'string' && value.trim().toLowerCase() === 'true'
}

export const runtimeEnv = {
  clerkPublishableKey: pickFirstDefined(
    import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
    import.meta.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  ),
  convexUrl: pickFirstDefined(
    import.meta.env.VITE_CONVEX_URL,
    import.meta.env.NEXT_PUBLIC_CONVEX_URL,
  ),
  sentryDsn: pickFirstDefined(
    import.meta.env.VITE_SENTRY_DSN,
    import.meta.env.NEXT_PUBLIC_SENTRY_DSN,
  ),
  disableRegistration:
    readBoolean(import.meta.env.VITE_DISABLE_REGISTRATION) ||
    readBoolean(import.meta.env.NEXT_PUBLIC_DISABLE_REGISTRATION),
}
