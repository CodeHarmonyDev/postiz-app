import { useMutation, useQuery } from 'convex/react'
import { api } from '@gitroom/convex/_generated/api'
import { useAppViewer } from '../shell/use-app-viewer'

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

export function useProfileSettings() {
  const { viewer } = useAppViewer()
  const updateProfileMut = useMutation(api.settings.updateProfile)

  async function updateProfile(updates: {
    firstName?: string
    lastName?: string
    bio?: string
    timezone?: string
    language?: string
  }) {
    await updateProfileMut(updates)
  }

  return {
    user: viewer?.user ?? null,
    updateProfile,
  }
}

// ---------------------------------------------------------------------------
// Organization
// ---------------------------------------------------------------------------

export function useOrganizationSettings() {
  const { viewer } = useAppViewer()
  const updateOrgMut = useMutation(api.settings.updateOrganization)
  const organizationId = viewer?.organization._id

  async function updateOrganization(updates: { name?: string; description?: string }) {
    if (!organizationId) return
    await updateOrgMut({ organizationId, ...updates })
  }

  return {
    organization: viewer?.organization ?? null,
    membership: viewer?.membership ?? null,
    updateOrganization,
  }
}

// ---------------------------------------------------------------------------
// Team members
// ---------------------------------------------------------------------------

export type TeamMember = {
  membershipId: string
  userId: string
  email?: string
  fullName?: string
  imageUrl?: string
  role: 'SUPERADMIN' | 'ADMIN' | 'USER'
  disabled: boolean
  joinedAt: number
}

export function useTeamMembers() {
  const { viewer } = useAppViewer()
  const organizationId = viewer?.organization._id

  const members = useQuery(
    api.settings.listMembers,
    organizationId ? { organizationId } : 'skip',
  )

  const changeRoleMut = useMutation(api.settings.changeMemberRole)
  const removeMemberMut = useMutation(api.settings.removeMember)

  async function changeRole(membershipId: string, role: 'SUPERADMIN' | 'ADMIN' | 'USER') {
    if (!organizationId) return
    await changeRoleMut({ organizationId, membershipId, role })
  }

  async function removeMember(membershipId: string) {
    if (!organizationId) return
    await removeMemberMut({ organizationId, membershipId })
  }

  return {
    members: (members ?? []) as Array<TeamMember>,
    isLoading: members === undefined,
    currentUserId: viewer?.user._id ? String(viewer.user._id) : null,
    currentRole: viewer?.membership.role ?? null,
    changeRole,
    removeMember,
  }
}

// ---------------------------------------------------------------------------
// API keys
// ---------------------------------------------------------------------------

export type ApiKey = {
  id: string
  prefix: string
  description?: string
  scopes: string[]
  revokedAt?: number
  lastUsedAt?: number
  createdAt: number
}

export function useApiKeys() {
  const { viewer } = useAppViewer()
  const organizationId = viewer?.organization._id

  const keys = useQuery(
    api.settings.listApiKeys,
    organizationId ? { organizationId } : 'skip',
  )

  const revokeKeyMut = useMutation(api.settings.revokeApiKey)

  async function revokeKey(apiKeyId: string) {
    if (!organizationId) return
    await revokeKeyMut({ organizationId, apiKeyId })
  }

  return {
    keys: (keys ?? []) as Array<ApiKey>,
    isLoading: keys === undefined,
    isAdmin:
      viewer?.membership.role === 'ADMIN' || viewer?.membership.role === 'SUPERADMIN',
    revokeKey,
  }
}
