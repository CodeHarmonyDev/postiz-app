import { ReactNode } from 'react';
import { ClerkProvider } from '@clerk/nextjs';
import { ClerkConvexClientProvider } from './clerk-convex-client-provider';

export function AppAuthProviders({ children }: { children: ReactNode }) {
  const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  if (!clerkPublishableKey) {
    return <>{children}</>;
  }

  return (
    <ClerkProvider>
      <ClerkConvexClientProvider>{children}</ClerkConvexClientProvider>
    </ClerkProvider>
  );
}
