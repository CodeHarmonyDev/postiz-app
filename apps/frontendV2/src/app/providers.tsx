import type { ReactNode } from 'react'
import { ClerkProvider, useAuth } from '@clerk/react'
import { ConvexProviderWithClerk } from 'convex/react-clerk'
import { runtimeEnv } from '../lib/env'
import { getConvexClient } from '../lib/convex'
import { ConvexViewerSync } from './providers/convex-viewer-sync'

function ConvexBoundary({ children }: { children: ReactNode }) {
  const convexClient = getConvexClient()

  if (!convexClient) {
    return <>{children}</>
  }

  return (
    <ConvexProviderWithClerk client={convexClient} useAuth={useAuth}>
      <ConvexViewerSync />
      {children}
    </ConvexProviderWithClerk>
  )
}

export function AppProviders({ children }: { children: ReactNode }) {
  if (!runtimeEnv.clerkPublishableKey) {
    return <>{children}</>
  }

  return (
    <ClerkProvider publishableKey={runtimeEnv.clerkPublishableKey}>
      <ConvexBoundary>{children}</ConvexBoundary>
    </ClerkProvider>
  )
}
