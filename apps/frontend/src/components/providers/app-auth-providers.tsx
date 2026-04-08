'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { ClerkProvider } from '@clerk/nextjs';
import { ClerkConvexClientProvider } from './clerk-convex-client-provider';

export function AppAuthProviders({ children }: { children: ReactNode }) {
  const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const pathname = usePathname();

  if (!clerkPublishableKey) {
    return <>{children}</>;
  }

  const shouldMountConvex =
    !pathname?.startsWith('/auth') || pathname.startsWith('/auth/complete');

  return (
    <ClerkProvider>
      {shouldMountConvex ? (
        <ClerkConvexClientProvider>{children}</ClerkConvexClientProvider>
      ) : (
        children
      )}
    </ClerkProvider>
  );
}
