import { useMemo, useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '@gitroom/convex/_generated/api'
import { useAppViewer } from '../shell/use-app-viewer'

export type CalendarPost = {
  id: string
  content: string
  publishDate: string
  releaseURL?: string
  releaseId?: string
  state: 'QUEUE' | 'PUBLISHED' | 'ERROR' | 'DRAFT'
  group: string
  tags: Array<{ tag: { id: string; name: string; color: string } }>
  integration: {
    id: string
    providerIdentifier: string
    name: string
    picture: string
  }
  intervalInDays?: number
  actualDate?: string
}

function getWeekBounds(date: Date) {
  const start = new Date(date)
  start.setUTCHours(0, 0, 0, 0)
  start.setUTCDate(start.getUTCDate() - start.getUTCDay())

  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + 7)
  end.setUTCMilliseconds(-1)

  return { startAt: start.getTime(), endAt: end.getTime() }
}

export function useCalendarPosts() {
  const { viewer } = useAppViewer()
  const organizationId = viewer?.organization._id

  const [weekOffset, setWeekOffset] = useState(0)

  const bounds = useMemo(() => {
    const now = new Date()
    now.setUTCDate(now.getUTCDate() + weekOffset * 7)
    return getWeekBounds(now)
  }, [weekOffset])

  const result = useQuery(
    api.posts.listForCalendar,
    organizationId
      ? { organizationId, startAt: bounds.startAt, endAt: bounds.endAt }
      : 'skip',
  )

  const posts = (result?.posts ?? []) as Array<CalendarPost>

  const postsByDay = useMemo(() => {
    const map = new Map<string, Array<CalendarPost>>()

    for (const post of posts) {
      const day = post.publishDate.slice(0, 10)
      const existing = map.get(day) ?? []
      existing.push(post)
      map.set(day, existing)
    }

    return map
  }, [posts])

  const weekDays = useMemo(() => {
    const days: Array<{ date: string; label: string; isToday: boolean }> = []
    const start = new Date(bounds.startAt)
    const todayStr = new Date().toISOString().slice(0, 10)

    for (let i = 0; i < 7; i++) {
      const d = new Date(start)
      d.setUTCDate(d.getUTCDate() + i)
      const dateStr = d.toISOString().slice(0, 10)
      days.push({
        date: dateStr,
        label: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' }),
        isToday: dateStr === todayStr,
      })
    }

    return days
  }, [bounds.startAt])

  return {
    posts,
    postsByDay,
    weekDays,
    weekOffset,
    isLoading: result === undefined,
    isEmpty: result !== undefined && posts.length === 0,
    goToPreviousWeek: () => setWeekOffset((current) => current - 1),
    goToNextWeek: () => setWeekOffset((current) => current + 1),
    goToCurrentWeek: () => setWeekOffset(0),
  }
}
