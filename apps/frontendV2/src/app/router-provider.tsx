import { useEffect } from 'react'
import { RouterProvider as TanStackRouterProvider } from '@tanstack/react-router'
import { useAuth } from '@clerk/react'
import { runtimeEnv } from '../lib/env'
import { router } from './router'
import { fallbackRouterAuthContext } from './router-context'

function RouterProviderWithClerk() {
  const { isLoaded, isSignedIn } = useAuth()

  useEffect(() => {
    void router.invalidate()
  }, [isLoaded, isSignedIn])

  return (
    <TanStackRouterProvider
      router={router}
      context={{
        auth: {
          hasClerk: true,
          isLoaded,
          isSignedIn: Boolean(isSignedIn),
        },
      }}
    />
  )
}

export function AppRouterProvider() {
  if (!runtimeEnv.clerkPublishableKey) {
    return (
      <TanStackRouterProvider
        router={router}
        context={{ auth: fallbackRouterAuthContext }}
      />
    )
  }

  return <RouterProviderWithClerk />
}
