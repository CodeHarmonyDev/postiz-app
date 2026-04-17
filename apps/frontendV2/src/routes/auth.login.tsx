import { createFileRoute } from '@tanstack/react-router'
import { redirectSignedInUser } from '../app/router-guards'
import { RuntimeConfigNotice } from '../components/runtime-config-notice'
import { SignInForm } from '../features/auth/sign-in-form'
import { runtimeEnv } from '../lib/env'

export const Route = createFileRoute('/auth/login')({
  validateSearch: (search) => ({
    returnTo: typeof search.returnTo === 'string' ? search.returnTo : undefined,
  }),
  beforeLoad: redirectSignedInUser,
  component: SignInPage,
})

function SignInPage() {
  if (!runtimeEnv.clerkPublishableKey) {
    return (
      <RuntimeConfigNotice
        title="Clerk configuration is required before Frontend V2 auth can run."
        description="The custom sign-in experience depends on the Clerk React SDK and should stay separate from legacy cookie auth in the old Next app."
        variables={[
          'VITE_CLERK_PUBLISHABLE_KEY',
          'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
        ]}
      />
    )
  }

  return <SignInForm />
}
