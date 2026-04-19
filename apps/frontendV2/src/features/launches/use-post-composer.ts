import { useState, useCallback } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@gitroom/convex/_generated/api'
import { useAppViewer } from '../shell/use-app-viewer'
import { useIntegrations, type DashboardIntegration } from '../integrations/use-integrations'
import { useTags, type Tag } from './use-tags'

export type ComposerMode = 'schedule' | 'draft' | 'now'

export type ComposerPostValue = {
  content: string
  image: Array<{
    path: string
    alt?: string
  }>
}

export type ComposerState = {
  mode: ComposerMode
  selectedIntegrationIds: string[]
  values: ComposerPostValue[]
  date: string
  time: string
  selectedTagIds: string[]
  repeatIntervalDays: number | undefined
  shortLink: boolean
}

function defaultDateTime() {
  const now = new Date()
  now.setMinutes(now.getMinutes() + 60)
  now.setMinutes(0)
  const date = now.toISOString().slice(0, 10)
  const time = now.toISOString().slice(11, 16)
  return { date, time }
}

export function usePostComposer() {
  const { viewer } = useAppViewer()
  const organizationId = viewer?.organization._id
  const { integrations } = useIntegrations()
  const { tags } = useTags()

  const upsertMut = useMutation(api.posts.upsertComposerPosts)

  const nextSlot = useQuery(
    api.posts.findNextAvailableSlot,
    organizationId ? { organizationId } : 'skip',
  )

  const { date: defaultDate, time: defaultTime } = defaultDateTime()

  const [state, setState] = useState<ComposerState>({
    mode: 'schedule',
    selectedIntegrationIds: [],
    values: [{ content: '', image: [] }],
    date: defaultDate,
    time: defaultTime,
    selectedTagIds: [],
    repeatIntervalDays: undefined,
    shortLink: false,
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const activeIntegrations = integrations.filter(
    (i) => !i.disabled && !i.refreshNeeded && !i.inBetweenSteps,
  )

  const selectedIntegrations = activeIntegrations.filter((i) =>
    state.selectedIntegrationIds.includes(i.id),
  )

  const selectedTags = tags.filter((t) => state.selectedTagIds.includes(t.id))

  const toggleIntegration = useCallback((integrationId: string) => {
    setState((prev) => {
      const ids = prev.selectedIntegrationIds.includes(integrationId)
        ? prev.selectedIntegrationIds.filter((id) => id !== integrationId)
        : [...prev.selectedIntegrationIds, integrationId]
      return { ...prev, selectedIntegrationIds: ids }
    })
  }, [])

  const toggleTag = useCallback((tagId: string) => {
    setState((prev) => {
      const ids = prev.selectedTagIds.includes(tagId)
        ? prev.selectedTagIds.filter((id) => id !== tagId)
        : [...prev.selectedTagIds, tagId]
      return { ...prev, selectedTagIds: ids }
    })
  }, [])

  const updateContent = useCallback((index: number, content: string) => {
    setState((prev) => {
      const values = [...prev.values]
      values[index] = { ...values[index], content }
      return { ...prev, values }
    })
  }, [])

  const addPostValue = useCallback(() => {
    setState((prev) => ({
      ...prev,
      values: [...prev.values, { content: '', image: [] }],
    }))
  }, [])

  const removePostValue = useCallback((index: number) => {
    setState((prev) => {
      if (prev.values.length <= 1) return prev
      return { ...prev, values: prev.values.filter((_, i) => i !== index) }
    })
  }, [])

  const setMode = useCallback((mode: ComposerMode) => {
    setState((prev) => ({ ...prev, mode }))
  }, [])

  const setDate = useCallback((date: string) => {
    setState((prev) => ({ ...prev, date }))
  }, [])

  const setTime = useCallback((time: string) => {
    setState((prev) => ({ ...prev, time }))
  }, [])

  const setRepeatInterval = useCallback((days: number | undefined) => {
    setState((prev) => ({ ...prev, repeatIntervalDays: days }))
  }, [])

  const setShortLink = useCallback((shortLink: boolean) => {
    setState((prev) => ({ ...prev, shortLink }))
  }, [])

  const useNextSlot = useCallback(() => {
    if (!nextSlot?.date) return

    const slotDate = nextSlot.date.slice(0, 10)
    const slotTime = nextSlot.date.slice(11, 16)
    setState((prev) => ({ ...prev, date: slotDate, time: slotTime }))
  }, [nextSlot])

  const canSubmit =
    state.selectedIntegrationIds.length > 0 &&
    state.values.some((v) => v.content.trim().length > 0) &&
    !isSubmitting

  const reset = useCallback(() => {
    const { date, time } = defaultDateTime()
    setState({
      mode: 'schedule',
      selectedIntegrationIds: [],
      values: [{ content: '', image: [] }],
      date,
      time,
      selectedTagIds: [],
      repeatIntervalDays: undefined,
      shortLink: false,
    })
    setError(null)
  }, [])

  async function submit() {
    if (!canSubmit || !organizationId) return

    setIsSubmitting(true)
    setError(null)

    try {
      const publishDate = `${state.date}T${state.time}:00`

      await upsertMut({
        organizationId,
        payload: {
          type: state.mode,
          shortLink: state.shortLink,
          inter: state.repeatIntervalDays,
          date: publishDate,
          tags: selectedTags.map((t) => ({ value: t.id, label: t.name })),
          posts: state.selectedIntegrationIds.map((integrationId) => ({
            integration: { id: integrationId as any },
            value: state.values.map((v, index) => ({
              content: v.content,
              delay: index > 0 ? 5 : undefined,
              image: v.image,
            })),
            settings: {},
          })),
        },
      })

      reset()
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create post')
      return false
    } finally {
      setIsSubmitting(false)
    }
  }

  return {
    state,
    activeIntegrations,
    selectedIntegrations,
    tags,
    selectedTags,
    nextSlot: nextSlot?.date,
    isSubmitting,
    error,
    canSubmit,
    toggleIntegration,
    toggleTag,
    updateContent,
    addPostValue,
    removePostValue,
    setMode,
    setDate,
    setTime,
    setRepeatInterval,
    setShortLink,
    useNextSlot,
    submit,
    reset,
    clearError: () => setError(null),
  }
}
