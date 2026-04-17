import { createFileRoute } from '@tanstack/react-router'
import { RuntimeConfigNotice } from '../components/runtime-config-notice'
import { AuthCompleteScreen } from '../features/auth/auth-complete'
import { runtimeEnv } from '../lib/env'

export const Route = createFileRoute('/auth/complete')({
  component: AuthCompletePage,
})

function AuthCompletePage() {
  if (!runtimeEnv.clerkPublishableKey) {
    return (
      <RuntimeConfigNotice
        title="Clerk is required to complete the sign-in handoff."
        description="The completion route only exists to bridge a signed-in Clerk session into Convex viewer state."
        variables={[
          'VITE_CLERK_PUBLISHABLE_KEY',
          'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
        ]}
      />
    )
  }

  if (!runtimeEnv.convexUrl) {
    return (
      <RuntimeConfigNotice
        title="Convex is required to finish the Frontend V2 sign-in flow."
        description="This route syncs the signed-in Clerk user into Convex and creates the default workspace when needed."
        variables={[
          'VITE_CONVEX_URL',
          'NEXT_PUBLIC_CONVEX_URL',
        ]}
      />
    )
  }

  return <AuthCompleteScreen />
}
