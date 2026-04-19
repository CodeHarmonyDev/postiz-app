import { useQuery } from 'convex/react'
import { api } from '@gitroom/convex/_generated/api'
import { useAppViewer } from '../shell/use-app-viewer'

export type OverviewMetrics = {
  totalPosts: number
  published: number
  queued: number
  drafts: number
  errors: number
  totalIntegrations: number
  activeIntegrations: number
  needsAttentionIntegrations: number
}

export type IntegrationMetric = {
  integrationId: string
  integrationName: string
  providerIdentifier: string
  picture: string
  total: number
  published: number
  queued: number
  drafts: number
  errors: number
}

export type DayMetric = {
  date: string
  published: number
  queued: number
  drafts: number
  errors: number
  total: number
}

export function useAnalyticsOverview() {
  const { viewer } = useAppViewer()
  const organizationId = viewer?.organization._id

  const result = useQuery(
    api.analytics.overview,
    organizationId ? { organizationId } : 'skip',
  )

  return {
    metrics: result as OverviewMetrics | undefined,
    isLoading: result === undefined,
  }
}

export function usePostsByIntegration() {
  const { viewer } = useAppViewer()
  const organizationId = viewer?.organization._id

  const result = useQuery(
    api.analytics.postsByIntegration,
    organizationId ? { organizationId } : 'skip',
  )

  return {
    integrations: (result ?? []) as Array<IntegrationMetric>,
    isLoading: result === undefined,
    isEmpty: result !== undefined && result.length === 0,
  }
}

export function usePostsOverTime(days: number = 30) {
  const { viewer } = useAppViewer()
  const organizationId = viewer?.organization._id

  const result = useQuery(
    api.analytics.postsOverTime,
    organizationId ? { organizationId, days } : 'skip',
  )

  return {
    data: (result ?? []) as Array<DayMetric>,
    isLoading: result === undefined,
    isEmpty: result !== undefined && result.length === 0,
  }
}
