import { useQuery } from 'convex/react'
import { api } from '@gitroom/convex/_generated/api'
import { useAppViewer } from '../shell/use-app-viewer'

export type Tag = {
  id: string
  name: string
  color: string
}

export function useTags() {
  const { viewer } = useAppViewer()
  const organizationId = viewer?.organization._id

  const result = useQuery(
    api.posts.listTags,
    organizationId ? { organizationId } : 'skip',
  )

  return {
    tags: (result?.tags ?? []) as Array<Tag>,
    isLoading: result === undefined,
  }
}
