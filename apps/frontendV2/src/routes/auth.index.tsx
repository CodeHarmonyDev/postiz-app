import { createFileRoute } from '@tanstack/react-router'
import { redirectSignedInUser } from '../app/router-guards'
import { RuntimeConfigNotice } from '../components/runtime-config-notice'
import { SignUpForm } from '../features/auth/sign-up-form'
import { runtimeEnv } from '../lib/env'

export const Route = createFileRoute('/auth/')({
  beforeLoad: redirectSignedInUser,
  component: SignUpPage,
})

function SignUpPage() {
  if (!runtimeEnv.clerkPublishableKey) {
    return (
      <RuntimeConfigNotice
        title="Clerk configuration is required before Frontend V2 auth can run."
        description="The new app keeps Clerk as the authentication authority, so the custom sign-up flow cannot mount until a public Clerk key is available."
        variables={[
          'VITE_CLERK_PUBLISHABLE_KEY',
          'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
        ]}
      />
    )
  }

  return <SignUpForm registrationDisabled={runtimeEnv.disableRegistration} />
}
