import { createFileRoute } from '@tanstack/react-router'
import { AuthenticateWithRedirectCallback } from '@clerk/react'
import { RuntimeConfigNotice } from '../components/runtime-config-notice'
import { runtimeEnv } from '../lib/env'

export const Route = createFileRoute('/auth/sso-callback')({
  component: AuthSsoCallbackPage,
})

function AuthSsoCallbackPage() {
  if (!runtimeEnv.clerkPublishableKey) {
    return (
      <RuntimeConfigNotice
        title="Clerk is required for SSO callback handling."
        description="Frontend V2 uses Clerk to resolve OAuth handshakes before routing the user into the Convex sync completion step."
        variables={[
          'VITE_CLERK_PUBLISHABLE_KEY',
          'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
        ]}
      />
    )
  }

  return <AuthenticateWithRedirectCallback />
}
