import { useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '@gitroom/convex/_generated/api'
import { useAppViewer } from '../shell/use-app-viewer'
import type { CalendarPost } from './use-calendar-posts'

const PAGE_SIZE = 10

export function useUpcomingPosts() {
  const { viewer } = useAppViewer()
  const organizationId = viewer?.organization._id
  const [page, setPage] = useState(0)

  const result = useQuery(
    api.posts.listUpcoming,
    organizationId
      ? { organizationId, page, limit: PAGE_SIZE }
      : 'skip',
  )

  return {
    posts: (result?.posts ?? []) as Array<CalendarPost>,
    total: result?.total ?? 0,
    page,
    hasMore: result?.hasMore ?? false,
    isLoading: result === undefined,
    isEmpty: result !== undefined && result.posts.length === 0 && page === 0,
    goToNextPage: () => setPage((current) => current + 1),
    goToPreviousPage: () => setPage((current) => Math.max(0, current - 1)),
  }
}
