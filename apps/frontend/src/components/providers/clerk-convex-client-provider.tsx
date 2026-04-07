'use client';

import { ReactNode } from 'react';
import { useAuth } from '@clerk/nextjs';
import { ConvexReactClient } from 'convex/react';
import { ConvexProviderWithClerk } from 'convex/react-clerk';
import { ConvexViewerSync } from './convex-viewer-sync';

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

let convexClient: ConvexReactClient | null = null;

function getConvexClient() {
  if (!convexUrl) {
    return null;
  }

  if (!convexClient) {
    convexClient = new ConvexReactClient(convexUrl);
  }

  return convexClient;
}

export function ClerkConvexClientProvider({
  children,
}: {
  children: ReactNode;
}) {
  const client = getConvexClient();

  if (!client) {
    return <>{children}</>;
  }

  return (
    <ConvexProviderWithClerk client={client} useAuth={useAuth}>
      <ConvexViewerSync />
      {children}
    </ConvexProviderWithClerk>
  );
}
