import { useState, useCallback } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@gitroom/convex/_generated/api'
import { useAppViewer } from '../shell/use-app-viewer'

export type MediaItem = {
  id: string
  name: string
  originalName?: string
  url?: string
  thumbnailUrl?: string
  kind: string
  fileSize: number
  alt?: string
  createdAt: number
  mediaTags?: string[]
  checksum?: string
}

export type MediaTag = {
  id: string
  name: string
  color: string
}

export type MediaSortBy = 'date' | 'name' | 'size'
export type MediaSortOrder = 'asc' | 'desc'

const PAGE_SIZE = 12

export function useMedia(options?: {
  search?: string
  kindFilter?: string
  tagFilter?: string
  sortBy?: MediaSortBy
  sortOrder?: MediaSortOrder
}) {
  const { viewer } = useAppViewer()
  const organizationId = viewer?.organization._id
  const [page, setPage] = useState(0)

  const result = useQuery(
    api.media.list,
    organizationId
      ? {
          organizationId,
          page,
          limit: PAGE_SIZE,
          search: options?.search || undefined,
          kindFilter: options?.kindFilter || undefined,
          tagFilter: options?.tagFilter || undefined,
          sortBy: options?.sortBy || undefined,
          sortOrder: options?.sortOrder || undefined,
        }
      : 'skip',
  )

  return {
    media: (result?.media ?? []) as Array<MediaItem>,
    total: result?.total ?? 0,
    page,
    pageSize: PAGE_SIZE,
    hasMore: result?.hasMore ?? false,
    isLoading: result === undefined,
    isEmpty: result !== undefined && result.media.length === 0 && page === 0,
    goToNextPage: () => setPage((current) => current + 1),
    goToPreviousPage: () => setPage((current) => Math.max(0, current - 1)),
    resetPage: () => setPage(0),
  }
}

export function useMediaUpload() {
  const { viewer } = useAppViewer()
  const organizationId = viewer?.organization._id
  const generateUploadUrl = useMutation(api.media.generateUploadUrl)
  const saveUploadedFile = useMutation(api.media.saveUploadedFile)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const computeChecksum = useCallback(async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer()
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  }, [])

  async function upload(file: File) {
    if (!organizationId) {
      setError('No active organization')
      return null
    }

    setIsUploading(true)
    setError(null)

    try {
      const checksum = await computeChecksum(file)

      const uploadUrl = await generateUploadUrl({})
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      })

      if (!response.ok) {
        throw new Error('Upload failed')
      }

      const { storageId } = await response.json()
      const kind = file.type.startsWith('image/')
        ? 'image'
        : file.type.startsWith('video/')
          ? 'video'
          : 'file'

      const result = await saveUploadedFile({
        organizationId,
        storageId,
        name: file.name,
        originalName: file.name,
        kind,
        fileSize: file.size,
        checksum,
      })

      return result
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
      return null
    } finally {
      setIsUploading(false)
    }
  }

  return {
    upload,
    isUploading,
    error,
    clearError: () => setError(null),
  }
}

export function useMediaActions() {
  const { viewer } = useAppViewer()
  const organizationId = viewer?.organization._id
  const updateMetadataMut = useMutation(api.media.updateMetadata)
  const removeMediaMut = useMutation(api.media.remove)
  const bulkRemoveMut = useMutation(api.media.bulkRemove)
  const updateMediaTagsMut = useMutation(api.media.updateMediaTags)

  async function updateMediaMetadata(
    mediaId: string,
    updates: { name?: string; alt?: string },
  ) {
    if (!organizationId) return

    await updateMetadataMut({
      organizationId,
      mediaId,
      ...updates,
    })
  }

  async function deleteMedia(mediaId: string) {
    if (!organizationId) return

    await removeMediaMut({
      organizationId,
      mediaId,
    })
  }

  async function bulkDeleteMedia(mediaIds: string[]) {
    if (!organizationId || mediaIds.length === 0) return null

    return bulkRemoveMut({
      organizationId,
      mediaIds,
    })
  }

  async function updateTags(mediaId: string, mediaTags: string[]) {
    if (!organizationId) return

    await updateMediaTagsMut({
      organizationId,
      mediaId,
      mediaTags,
    })
  }

  return {
    updateMediaMetadata,
    deleteMedia,
    bulkDeleteMedia,
    updateTags,
  }
}

export function useDuplicateCheck(checksum: string, fileName: string, fileSize: number) {
  const { viewer } = useAppViewer()
  const organizationId = viewer?.organization._id

  const result = useQuery(
    api.media.checkDuplicate,
    organizationId && checksum
      ? { organizationId, checksum, fileName, fileSize }
      : 'skip',
  )

  return {
    isDuplicate: result?.isDuplicate ?? false,
    existingMedia: result?.existingMedia ?? undefined,
    isChecking: result === undefined && !!checksum,
  }
}

export function useMediaTags() {
  const { viewer } = useAppViewer()
  const organizationId = viewer?.organization._id
  const createTagMut = useMutation(api.media.createMediaTag)
  const deleteTagMut = useMutation(api.media.deleteMediaTag)

  const result = useQuery(
    api.media.listMediaTags,
    organizationId ? { organizationId } : 'skip',
  )

  async function createTag(name: string, color: string) {
    if (!organizationId) return null

    return createTagMut({
      organizationId,
      name,
      color,
    })
  }

  async function deleteTag(tagId: string) {
    if (!organizationId) return

    await deleteTagMut({
      organizationId,
      tagId,
    })
  }

  return {
    tags: (result ?? []) as Array<MediaTag>,
    isLoading: result === undefined,
    createTag,
    deleteTag,
  }
}
