'use client';

import { useCallback } from 'react';
import { api } from '@gitroom/convex/_generated/api';
import { useAppViewer } from '@gitroom/frontend/components/layout/use-app-viewer';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useConvex } from 'convex/react';

function fallbackNow() {
  return new Date().toISOString().slice(0, 16) + ':00';
}

export function usePostSlot() {
  const fetch = useFetch();
  const convex = useConvex();
  const { canUseConvex } = useAppViewer();

  return useCallback(
    async (integrationId?: string) => {
      try {
        const response = await fetch(
          integrationId ? `/posts/find-slot/${integrationId}` : '/posts/find-slot'
        );

        if (response.ok) {
          const data = await response.json();

          if (data?.date) {
            return data.date as string;
          }
        }
      } catch {
        /** empty **/
      }

      if (canUseConvex) {
        const result = await convex.query(
          api.posts.findNextAvailableSlot,
          integrationId ? { integrationId } : {}
        );

        return result.date;
      }

      return fallbackNow();
    },
    [canUseConvex, convex, fetch]
  );
}
