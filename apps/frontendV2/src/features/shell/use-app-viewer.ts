import { useMemo } from 'react'
import { useAuth } from '@clerk/react'
import type { Id } from '@gitroom/convex/_generated/dataModel'
import { api } from '@gitroom/convex/_generated/api'
import { useConvexAuth, useMutation, useQuery } from 'convex/react'

export type AppOrganization = {
  id: Id<'organizations'>
  name: string
  role: string
  isDefault: boolean
}

export function useAppViewer() {
  const { isSignedIn } = useAuth()
  const { isAuthenticated, isLoading } = useConvexAuth()
  const shouldQuery = Boolean(isSignedIn) && Boolean(isAuthenticated)
  const viewer = useQuery(api.users.current, shouldQuery ? {} : 'skip')
  const organizations = useQuery(
    api.organizations.listForCurrentUser,
    shouldQuery ? {} : 'skip',
  )
  const syncViewer = useMutation(api.users.syncViewer)
  const setDefaultOrganization = useMutation(api.users.setDefaultOrganization)

  const availableOrganizations = useMemo<Array<AppOrganization>>(() => {
    if (!organizations) {
      return []
    }

    return organizations.map((entry) => ({
      id: entry.organization._id,
      name: entry.organization.name,
      role: entry.membership.role,
      isDefault: entry.isDefault,
    }))
  }, [organizations])

  return {
    viewer,
    organizations: availableOrganizations,
    isLoading:
      !isSignedIn ||
      isLoading ||
      (shouldQuery && (viewer === undefined || organizations === undefined)),
    needsSync: shouldQuery && viewer === null,
    retrySync: () => syncViewer({}),
    setDefaultOrganization: (organizationId: Id<'organizations'>) =>
      setDefaultOrganization({ organizationId }),
  }
}
