'use client';

import { useEffect, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { useMutation } from 'convex/react';
import { useConvexAuth } from 'convex/react';
import { api } from '@gitroom/convex/_generated/api';

export function ConvexViewerSync(): null {
  const { isSignedIn } = useUser();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const hasSyncedRef = useRef(false);
  const syncViewer = useMutation(api.users.syncViewer);

  useEffect(() => {
    if (!isSignedIn || isLoading || !isAuthenticated || hasSyncedRef.current) {
      return;
    }

    hasSyncedRef.current = true;
    void syncViewer({}).catch(() => {
      hasSyncedRef.current = false;
    });
  }, [isAuthenticated, isLoading, isSignedIn, syncViewer]);

  return null;
}
