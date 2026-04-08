'use client';

import { useCallback, useMemo } from 'react';
import { useUser as useClerkUser } from '@clerk/nextjs';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { api } from '@gitroom/convex/_generated/api';
import type { Id } from '@gitroom/convex/_generated/dataModel';
import {
  AppUserRole,
  AppUserTier,
  RawAppUser,
} from '@gitroom/frontend/components/layout/user.context';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { pricing } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/pricing';
import { useMutation, useQuery } from 'convex/react';
import { useConvexAuth } from 'convex/react';
import useSWR from 'swr';

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

const clerkConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
const convexConfigured = Boolean(process.env.NEXT_PUBLIC_CONVEX_URL);

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

function mapLegacyUser(legacyUser: any): RawAppUser | undefined {
  if (!legacyUser?.id || !legacyUser?.orgId) {
    return undefined;
  }

  return legacyUser as RawAppUser;
}

function mapConvexViewerToRawUser(
  viewer: any,
  billingEnabled: boolean
): RawAppUser | undefined {
  if (!viewer) {
    return undefined;
  }

  const tier = normalizeTier(viewer.subscription?.tier, billingEnabled);
  const totalChannels =
    viewer.subscription?.totalChannels ??
    (!billingEnabled ? 10000 : pricing[tier].channel);

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
    bio: viewer.user.bio,
    audience: viewer.user.audience ?? 0,
    isSuperAdmin: viewer.user.isSuperAdmin,
    admin: viewer.user.isSuperAdmin,
    orgId: String(viewer.organization._id),
    tier,
    publicApi: '',
    role: viewer.membership.role,
    totalChannels,
    isLifetime: viewer.subscription?.isLifetime,
    impersonate: false,
    allowTrial: viewer.organization.allowTrial,
    isTrailing: billingEnabled ? viewer.organization.isTrailing : false,
    streakSince: viewer.organization.streakSince
      ? new Date(viewer.organization.streakSince).toISOString()
      : null,
  };
}

export function useAppViewer() {
  const fetch = useFetch();
  const { billingEnabled } = useVariables();
  const { isSignedIn } = useClerkUser();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const shouldQueryConvex =
    clerkConfigured &&
    convexConfigured &&
    Boolean(isSignedIn) &&
    Boolean(isAuthenticated);
  const convexViewer = useQuery(
    api.users.current,
    shouldQueryConvex ? {} : 'skip'
  );
  const convexOrganizations = useQuery(
    api.organizations.listForCurrentUser,
    shouldQueryConvex ? {} : 'skip'
  );
  const setDefaultOrganization = useMutation(api.users.setDefaultOrganization);
  const syncViewer = useMutation(api.users.syncViewer);

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
  } = useSWR(
    clerkConfigured ? null : '/user/self',
    loadLegacyUser,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
      refreshWhenOffline: false,
      refreshWhenHidden: false,
    }
  );

  const legacyUser = useMemo(
    () => mapLegacyUser(legacyUserData),
    [legacyUserData]
  );

  const {
    data: legacyOrganizationsData,
    mutate: mutateLegacyOrganizations,
    isLoading: isLoadingLegacyOrganizations,
  } = useSWR(
    clerkConfigured ? null : legacyUser ? '/user/organizations' : null,
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
    () => mapConvexViewerToRawUser(convexViewer, billingEnabled),
    [billingEnabled, convexViewer]
  );

  const user = clerkConfigured ? convexUser : legacyUser;

  const organizations = useMemo(() => {
    if (clerkConfigured && convexConfigured) {
      if (!convexOrganizations) {
        return [] as Array<AppOrganization>;
      }

      return convexOrganizations.map((item) => ({
        id: String(item.organization._id),
        name: item.organization.name,
        role: item.membership.role,
        source: 'convex' as const,
      }));
    }

    if (legacyUser && Array.isArray(legacyOrganizationsData)) {
      return legacyOrganizationsData.map((organization: LegacyOrganization) => ({
        id: organization.id,
        name: organization.name,
        source: 'legacy' as const,
      }));
    }

    return [] as Array<AppOrganization>;
  }, [convexOrganizations, legacyOrganizationsData, legacyUser]);

  const canUseConvex =
    clerkConfigured &&
    convexConfigured &&
    Boolean(isSignedIn) &&
    !isLoading &&
    Boolean(isAuthenticated) &&
    Boolean(convexUser);

  const convexUnavailableReason = useMemo(() => {
    if (!clerkConfigured || !convexConfigured || !isSignedIn) {
      return null;
    }

    if (!isLoading && !isAuthenticated) {
      return 'auth_not_ready' as const;
    }

    if (!isLoading && isAuthenticated && convexViewer === null) {
      return 'viewer_not_synced' as const;
    }

    return null;
  }, [convexViewer, isAuthenticated, isLoading, isSignedIn]);

  const changeOrganization = useCallback(
    async (organization: AppOrganization) => {
      if (clerkConfigured) {
        if (!convexConfigured) {
          return;
        }

        await setDefaultOrganization({
          organizationId: organization.id as Id<'organizations'>,
        });
        await syncViewer({});
        return;
      }

      await fetch('/user/change-org', {
        method: 'POST',
        body: JSON.stringify({ id: organization.id }),
      });

      await Promise.all([mutateLegacyUser(), mutateLegacyOrganizations()]);
    },
    [
      fetch,
      mutateLegacyOrganizations,
      mutateLegacyUser,
      setDefaultOrganization,
      syncViewer,
    ]
  );

  return {
    user,
    organizations,
    canUseConvex,
    convexUnavailableReason,
    convexUser,
    legacyUser,
    isLoading: clerkConfigured
      ? Boolean(isSignedIn) &&
        (convexConfigured &&
          (isLoading ||
          convexViewer === undefined ||
          convexOrganizations === undefined ||
          convexViewer === null))
      : isLoadingLegacyUser || isLoadingLegacyOrganizations,
    refreshUser: async () => {
      if (clerkConfigured && convexConfigured && isSignedIn) {
        await syncViewer({});
        return;
      }

      await mutateLegacyUser();
    },
    refreshOrganizations: async () => {
      if (clerkConfigured && convexConfigured && isSignedIn) {
        await syncViewer({});
        return;
      }

      await mutateLegacyOrganizations();
    },
    changeOrganization,
  };
}
