import { createFileRoute } from '@tanstack/react-router'
import { RuntimeConfigNotice } from '../components/runtime-config-notice'
import { ForgotPasswordForm } from '../features/auth/forgot-password-form'
import { runtimeEnv } from '../lib/env'

export const Route = createFileRoute('/auth/forgot')({
  component: ForgotPasswordPage,
})

function ForgotPasswordPage() {
  if (!runtimeEnv.clerkPublishableKey) {
    return (
      <RuntimeConfigNotice
        title="Clerk configuration is required before password reset can run."
        description="Frontend V2 keeps password recovery in Clerk instead of recreating it in app-specific server routes."
        variables={[
          'VITE_CLERK_PUBLISHABLE_KEY',
          'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
        ]}
      />
    )
  }

  return <ForgotPasswordForm />
}
