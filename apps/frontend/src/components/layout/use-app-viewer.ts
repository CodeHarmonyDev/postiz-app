'use client';

import { useCallback, useMemo } from 'react';
import { useUser as useClerkUser } from '@clerk/nextjs';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { api } from '@gitroom/convex/_generated/api';
import type { Id } from '@gitroom/convex/_generated/dataModel';
import { useMutation, useQuery } from 'convex/react';
import { useConvexAuth } from 'convex/react';
import useSWR from 'swr';
import {
  AppUserRole,
  AppUserTier,
  RawAppUser,
} from '@gitroom/frontend/components/layout/user.context';

type LegacyOrganization = {
  id: string;
  name: string;
};

export type AppOrganization = {
  id: string;
  name: string;
  role?: AppUserRole;
  source: 'legacy' | 'convex';
};

function normalizeTier(
  tier: string | undefined,
  billingEnabled: boolean
): AppUserTier {
  if (!billingEnabled) {
    return 'ULTIMATE';
  }

  if (
    tier === 'FREE' ||
    tier === 'STANDARD' ||
    tier === 'PRO' ||
    tier === 'TEAM' ||
    tier === 'ULTIMATE'
  ) {
    return tier;
  }

  return 'FREE';
}

function mapConvexViewerToRawUser(
  viewer: any,
  legacyUser: RawAppUser | undefined,
  billingEnabled: boolean
): RawAppUser | undefined {
  if (!viewer) {
    return undefined;
  }

  const tier = normalizeTier(legacyUser?.tier, billingEnabled);
  const totalChannels = billingEnabled
    ? legacyUser?.totalChannels || 0
    : 10000;

  return {
    id: String(viewer.user._id),
    email: viewer.user.email,
    name:
      viewer.user.fullName ||
      [viewer.user.firstName, viewer.user.lastName]
        .filter(Boolean)
        .join(' ')
        .trim() ||
      viewer.user.email,
    firstName: viewer.user.firstName,
    lastName: viewer.user.lastName,
    imageUrl: viewer.user.imageUrl,
    timezone: viewer.user.timezone,
    language: viewer.user.language,
    bio: legacyUser?.bio,
    audience: legacyUser?.audience ?? 0,
    isSuperAdmin: viewer.user.isSuperAdmin,
    admin: viewer.user.isSuperAdmin,
    orgId: String(viewer.organization._id),
    tier,
    publicApi: legacyUser?.publicApi || '',
    role: viewer.membership.role,
    totalChannels,
    isLifetime: legacyUser?.isLifetime,
    impersonate: legacyUser?.impersonate ?? false,
    allowTrial: viewer.organization.allowTrial,
    isTrailing: billingEnabled ? viewer.organization.isTrailing : false,
    streakSince: viewer.organization.streakSince
      ? new Date(viewer.organization.streakSince).toISOString()
      : null,
  };
}

function mapLegacyUser(legacyUser: any): RawAppUser | undefined {
  if (!legacyUser?.id || !legacyUser?.orgId) {
    return undefined;
  }

  return legacyUser as RawAppUser;
}

export function useAppViewer() {
  const fetch = useFetch();
  const { billingEnabled } = useVariables();
  const { isSignedIn } = useClerkUser();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const convexViewer = useQuery(api.users.current);
  const convexOrganizations = useQuery(api.organizations.listForCurrentUser);
  const setDefaultOrganization = useMutation(api.users.setDefaultOrganization);

  const loadLegacyUser = useCallback(async () => {
    try {
      const response = await fetch('/user/self');

      if (!response.ok) {
        return undefined;
      }

      return await response.json();
    } catch {
      return undefined;
    }
  }, [fetch]);

  const loadLegacyOrganizations = useCallback(async () => {
    try {
      const response = await fetch('/user/organizations');

      if (!response.ok) {
        return [] as Array<LegacyOrganization>;
      }

      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch {
      return [] as Array<LegacyOrganization>;
    }
  }, [fetch]);

  const {
    data: legacyUserData,
    mutate: mutateLegacyUser,
    isLoading: isLoadingLegacyUser,
  } = useSWR('/user/self', loadLegacyUser, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    refreshWhenOffline: false,
    refreshWhenHidden: false,
  });

  const legacyUser = useMemo(
    () => mapLegacyUser(legacyUserData),
    [legacyUserData]
  );

  const {
    data: legacyOrganizationsData,
    mutate: mutateLegacyOrganizations,
    isLoading: isLoadingLegacyOrganizations,
  } = useSWR(
    legacyUser ? '/user/organizations' : null,
    loadLegacyOrganizations,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
      refreshWhenOffline: false,
      refreshWhenHidden: false,
    }
  );

  const convexUser = useMemo(
    () => mapConvexViewerToRawUser(convexViewer, legacyUser, billingEnabled),
    [billingEnabled, convexViewer, legacyUser]
  );

  const user = legacyUser || convexUser;

  const organizations = useMemo(() => {
    if (legacyUser && Array.isArray(legacyOrganizationsData)) {
      return legacyOrganizationsData.map((organization: LegacyOrganization) => ({
        id: organization.id,
        name: organization.name,
        source: 'legacy' as const,
      }));
    }

    if (convexOrganizations) {
      return convexOrganizations.map((item) => ({
        id: String(item.organization._id),
        name: item.organization.name,
        role: item.membership.role,
        source: 'convex' as const,
      }));
    }

    return [] as Array<AppOrganization>;
  }, [convexOrganizations, legacyOrganizationsData, legacyUser]);

  const canUseConvex =
    Boolean(isSignedIn) && !isLoading && !legacyUser && Boolean(convexUser);

  const changeOrganization = useCallback(
    async (organization: AppOrganization) => {
      if (organization.source === 'convex' && canUseConvex) {
        await setDefaultOrganization({
          organizationId: organization.id as Id<'organizations'>,
        });
      } else {
        await fetch('/user/change-org', {
          method: 'POST',
          body: JSON.stringify({ id: organization.id }),
        });
      }

      await Promise.all([mutateLegacyUser(), mutateLegacyOrganizations()]);
    },
    [
      canUseConvex,
      fetch,
      mutateLegacyOrganizations,
      mutateLegacyUser,
      setDefaultOrganization,
    ]
  );

  return {
    user,
    organizations,
    canUseConvex,
    convexUser,
    legacyUser,
    isLoading:
      isLoadingLegacyUser ||
      isLoadingLegacyOrganizations ||
      (Boolean(isSignedIn) && isLoading),
    refreshUser: async () => {
      await mutateLegacyUser();
    },
    refreshOrganizations: async () => {
      await mutateLegacyOrganizations();
    },
    changeOrganization,
  };
}
