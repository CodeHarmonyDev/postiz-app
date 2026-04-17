import { useQuery } from 'convex/react'
import { api } from '@gitroom/convex/_generated/api'
import { useAppViewer } from '../shell/use-app-viewer'

export type DashboardIntegration = {
  id: string
  name: string
  internalId: string
  disabled: boolean
  editor: 'none' | 'normal' | 'markdown' | 'html'
  picture: string
  identifier: string
  inBetweenSteps: boolean
  refreshNeeded: boolean
  isCustomFields: boolean
  display: string
  type: 'social' | 'article'
  time: Array<{ time: number }>
  changeProfilePicture: boolean
  changeNickName: boolean
  additionalSettings: string
  customer?: {
    id: string
    name: string
  }
}

export function useIntegrations() {
  const { viewer } = useAppViewer()
  const organizationId = viewer?.organization._id

  const integrations = useQuery(
    api.integrations.listForDashboard,
    organizationId ? { organizationId } : 'skip',
  )

  return {
    integrations: (integrations ?? []) as Array<DashboardIntegration>,
    isLoading: integrations === undefined,
    isEmpty: integrations !== undefined && integrations.length === 0,
  }
}
