'use client';

import { useCallback, useMemo } from 'react';
import { api } from '@gitroom/convex/_generated/api';
import { useAppViewer } from '@gitroom/frontend/components/layout/use-app-viewer';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useQuery } from 'convex/react';
import useSWR from 'swr';

export interface IntegrationListItem {
  name: string;
  id: string;
  internalId: string;
  disabled?: boolean;
  inBetweenSteps: boolean;
  editor: 'none' | 'normal' | 'markdown' | 'html';
  display: string;
  identifier: string;
  type: string;
  picture: string;
  changeProfilePicture: boolean;
  additionalSettings: string;
  changeNickName: boolean;
  refreshNeeded: boolean;
  isCustomFields: boolean;
  time: Array<{
    time: number;
  }>;
  customer?: {
    name?: string;
    id?: string;
  };
  customFields?: Array<any>;
}

type LegacyIntegrationListResponse = {
  available: boolean;
  integrations: Array<IntegrationListItem>;
};

export const LEGACY_INTEGRATIONS_LIST_KEY = 'legacy-integrations-list';

interface UseIntegrationListResult {
  data: Array<IntegrationListItem>;
  error: unknown;
  isLoading: boolean;
  mutate: () => Promise<Array<IntegrationListItem>>;
  source: 'legacy' | 'convex' | 'none';
}

export const useIntegrationList = (): UseIntegrationListResult => {
  const fetch = useFetch();
  const { canUseConvex } = useAppViewer();

  const load = useCallback(async (): Promise<LegacyIntegrationListResponse> => {
    try {
      const response = await fetch('/integrations/list');

      if (!response.ok) {
        return {
          available: false,
          integrations: [],
        };
      }

      const data = await response.json();

      return {
        available: true,
        integrations: Array.isArray(data?.integrations) ? data.integrations : [],
      };
    } catch {
      return {
        available: false,
        integrations: [],
      };
    }
  }, [fetch]);

  const {
    data: legacyIntegrationList,
    isLoading: isLoadingLegacyIntegrations,
    mutate,
    error,
  } = useSWR(canUseConvex ? null : LEGACY_INTEGRATIONS_LIST_KEY, load, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    revalidateOnMount: true,
    refreshWhenHidden: false,
    refreshWhenOffline: false,
  });

  const convexIntegrations = useQuery(
    api.integrations.listForDashboard,
    canUseConvex ? {} : 'skip'
  );

  const data = useMemo<Array<IntegrationListItem>>(() => {
    if (canUseConvex && convexIntegrations) {
      return convexIntegrations;
    }

    if (legacyIntegrationList?.available) {
      return legacyIntegrationList.integrations;
    }

    return [] as Array<IntegrationListItem>;
  }, [canUseConvex, convexIntegrations, legacyIntegrationList]);

  const refresh = useCallback(async () => {
    if (canUseConvex && convexIntegrations) {
      return convexIntegrations;
    }

    const next = await mutate();

    if (next?.available) {
      return next.integrations;
    }

    return [] as Array<IntegrationListItem>;
  }, [canUseConvex, convexIntegrations, mutate]);

  return {
    data,
    error,
    mutate: refresh,
    source: canUseConvex ? 'convex' : legacyIntegrationList?.available ? 'legacy' : 'none',
    isLoading:
      (canUseConvex && convexIntegrations === undefined) ||
      (!canUseConvex && isLoadingLegacyIntegrations),
  };
};
