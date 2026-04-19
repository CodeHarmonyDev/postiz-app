import { useState, useCallback, useEffect } from 'react'
import clsx from 'clsx'
import {
  useMedia,
  useMediaActions,
  useMediaTags,
  type MediaItem,
  type MediaSortBy,
  type MediaSortOrder,
} from './use-media'
import { MediaCard } from './media-card'
import { MediaUpload } from './media-upload'
import { MediaEditModal } from './media-edit-modal'
import { MediaTagModal } from './media-tag-modal'

type MediaTab = 'library' | 'upload'

const KIND_OPTIONS = [
  { value: 'all', label: 'All types' },
  { value: 'image', label: 'Images' },
  { value: 'video', label: 'Videos' },
  { value: 'file', label: 'Files' },
]

const SORT_OPTIONS: Array<{ value: MediaSortBy; label: string }> = [
  { value: 'date', label: 'Date' },
  { value: 'name', label: 'Name' },
  { value: 'size', label: 'Size' },
]

export function MediaView() {
  const [activeTab, setActiveTab] = useState<MediaTab>('library')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [kindFilter, setKindFilter] = useState('all')
  const [tagFilter, setTagFilter] = useState('')
  const [sortBy, setSortBy] = useState<MediaSortBy>('date')
  const [sortOrder, setSortOrder] = useState<MediaSortOrder>('desc')

  // Selection state for bulk ops
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectionMode, setSelectionMode] = useState(false)

  // Modals
  const [editingItem, setEditingItem] = useState<MediaItem | null>(null)
  const [taggingItem, setTaggingItem] = useState<MediaItem | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<MediaItem | null>(null)
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  const {
    media,
    total,
    page,
    pageSize,
    hasMore,
    isLoading,
    isEmpty,
    goToNextPage,
    goToPreviousPage,
    resetPage,
  } = useMedia({
    search: debouncedSearch,
    kindFilter,
    tagFilter: tagFilter || undefined,
    sortBy,
    sortOrder,
  })

  const { updateMediaMetadata, deleteMedia, bulkDeleteMedia, updateTags } = useMediaActions()
  const { tags: availableTags, createTag } = useMediaTags()

  // Reset page when filters change
  useEffect(() => {
    resetPage()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- resetPage is stable (setPage wrapper), only re-run on filter changes
  }, [debouncedSearch, kindFilter, tagFilter, sortBy, sortOrder])

  const toggleSelect = useCallback((item: MediaItem) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(item.id)) {
        next.delete(item.id)
      } else {
        next.add(item.id)
      }
      return next
    })
  }, [])

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(media.map((m) => m.id)))
  }, [media])

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
    setSelectionMode(false)
  }, [])

  function handleEnterSelectionMode() {
    setSelectionMode(true)
  }

  function handleExitSelectionMode() {
    setSelectionMode(false)
    setSelectedIds(new Set())
  }

  async function handleSaveMetadata(mediaId: string, updates: { name: string; alt: string }) {
    await updateMediaMetadata(mediaId, updates)
    setEditingItem(null)
  }

  async function handleDelete(item: MediaItem) {
    await deleteMedia(item.id)
    setConfirmDelete(null)
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.delete(item.id)
      return next
    })
  }

  async function handleBulkDelete() {
    await bulkDeleteMedia(Array.from(selectedIds))
    setConfirmBulkDelete(false)
    clearSelection()
  }

  async function handleSaveTags(mediaId: string, mediaTags: string[]) {
    await updateTags(mediaId, mediaTags)
    setTaggingItem(null)
  }

  function handleUploadComplete() {
    setActiveTab('library')
  }

  const tabs: Array<{ id: MediaTab; label: string }> = [
    { id: 'library', label: 'Library' },
    { id: 'upload', label: 'Upload' },
  ]

  const startItem = page * pageSize + 1
  const endItem = Math.min(page * pageSize + media.length, total)

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              'rounded-xl border px-4 py-2 text-sm font-medium transition',
              activeTab === tab.id
                ? 'border-sky-400/60 bg-sky-400/10 text-white'
                : 'border-slate-800 bg-slate-950/30 text-slate-400 hover:border-slate-600 hover:text-slate-200',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'upload' ? (
        <MediaUpload onUploadComplete={handleUploadComplete} />
      ) : (
        <>
          {/* Toolbar */}
          <div className="space-y-3">
            {/* Search + filters row */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <svg
                  className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search media..."
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/70 py-2 pl-10 pr-4 text-sm text-white placeholder:text-slate-600 outline-none transition focus:border-sky-400"
                />
              </div>

              {/* Kind filter */}
              <select
                value={kindFilter}
                onChange={(e) => setKindFilter(e.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-sky-400"
              >
                {KIND_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              {/* Tag filter */}
              {availableTags.length > 0 && (
                <select
                  value={tagFilter}
                  onChange={(e) => setTagFilter(e.target.value)}
                  className="rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-sky-400"
                >
                  <option value="">All tags</option>
                  {availableTags.map((tag) => (
                    <option key={tag.id} value={tag.name}>
                      {tag.name}
                    </option>
                  ))}
                </select>
              )}

              {/* Sort */}
              <div className="flex items-center gap-1">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as MediaSortBy)}
                  className="rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-sky-400"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                  className="rounded-xl border border-slate-700 bg-slate-950/70 px-2.5 py-2 text-sm text-slate-400 transition hover:border-slate-500 hover:text-white"
                  title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                >
                  {sortOrder === 'asc' ? (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Bulk actions row */}
            <div className="flex items-center gap-3">
              {!selectionMode ? (
                <button
                  type="button"
                  onClick={handleEnterSelectionMode}
                  className="rounded-xl border border-slate-700 bg-slate-950/30 px-3 py-1.5 text-xs text-slate-400 transition hover:border-slate-500 hover:text-white"
                >
                  Select
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={selectAll}
                    className="rounded-xl border border-slate-700 bg-slate-950/30 px-3 py-1.5 text-xs text-slate-400 transition hover:border-slate-500 hover:text-white"
                  >
                    Select all
                  </button>
                  <button
                    type="button"
                    onClick={handleExitSelectionMode}
                    className="rounded-xl border border-slate-700 bg-slate-950/30 px-3 py-1.5 text-xs text-slate-400 transition hover:border-slate-500 hover:text-white"
                  >
                    Cancel
                  </button>
                  {selectedIds.size > 0 && (
                    <button
                      type="button"
                      onClick={() => setConfirmBulkDelete(true)}
                      className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-300 transition hover:border-rose-400 hover:bg-rose-500/20"
                    >
                      Delete {selectedIds.size} selected
                    </button>
                  )}
                  <span className="text-xs text-slate-500">
                    {selectedIds.size} selected
                  </span>
                </>
              )}

              {/* Stats */}
              <span className="ml-auto text-xs text-slate-500">
                {total > 0 ? `${startItem}-${endItem} of ${total} items` : `${total} items`}
              </span>
            </div>
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="space-y-3 text-center">
                <div className="mx-auto h-1 w-32 overflow-hidden rounded-full bg-slate-800">
                  <div className="h-full w-1/2 animate-pulse rounded-full bg-gradient-to-r from-sky-400 to-orange-400" />
                </div>
                <p className="text-sm text-slate-400">Loading media...</p>
              </div>
            </div>
          ) : isEmpty ? (
            <div className="panel-soft flex flex-col items-center gap-4 py-16 text-center">
              <span className="text-4xl text-slate-600">{'\u{1F5BC}'}</span>
              <div>
                <p className="text-sm font-medium text-white">No media yet</p>
                <p className="mt-1 text-xs text-slate-400">
                  Upload your first file to get started.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('upload')}
                className="rounded-xl bg-gradient-to-r from-sky-400 to-orange-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:opacity-90"
              >
                Upload media
              </button>
            </div>
          ) : media.length === 0 ? (
            <div className="panel-soft flex flex-col items-center gap-4 py-16 text-center">
              <span className="text-4xl text-slate-600">{'\u{1F50D}'}</span>
              <div>
                <p className="text-sm font-medium text-white">No results found</p>
                <p className="mt-1 text-xs text-slate-400">
                  Try adjusting your search or filters.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSearch('')
                  setKindFilter('all')
                  setTagFilter('')
                }}
                className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-400 transition hover:border-slate-500 hover:text-white"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {media.map((item) => (
                <MediaCard
                  key={item.id}
                  item={item}
                  onEdit={setEditingItem}
                  onDelete={setConfirmDelete}
                  onTagEdit={setTaggingItem}
                  isSelected={selectedIds.has(item.id)}
                  onToggleSelect={toggleSelect}
                  selectionMode={selectionMode}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {total > pageSize && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={goToPreviousPage}
                disabled={page === 0}
                className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-400 transition hover:border-slate-500 hover:text-white disabled:opacity-40 disabled:hover:border-slate-700 disabled:hover:text-slate-400"
              >
                Previous
              </button>
              <span className="text-xs text-slate-500">
                Page {page + 1} of {Math.ceil(total / pageSize)}
              </span>
              <button
                type="button"
                onClick={goToNextPage}
                disabled={!hasMore}
                className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-400 transition hover:border-slate-500 hover:text-white disabled:opacity-40 disabled:hover:border-slate-700 disabled:hover:text-slate-400"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Edit modal */}
      {editingItem && (
        <MediaEditModal
          item={editingItem}
          onSave={handleSaveMetadata}
          onClose={() => setEditingItem(null)}
        />
      )}

      {/* Tag modal */}
      {taggingItem && (
        <MediaTagModal
          item={taggingItem}
          availableTags={availableTags}
          onSave={handleSaveTags}
          onClose={() => setTaggingItem(null)}
          onCreateTag={createTag}
        />
      )}

      {/* Single delete confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
          <div className="panel-surface w-full max-w-sm space-y-4 p-6">
            <h3 className="text-lg font-semibold text-white">Delete media?</h3>
            <p className="text-sm text-slate-300">
              Are you sure you want to delete{' '}
              <span className="font-medium text-white">{confirmDelete.name}</span>? This
              action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-400 transition hover:border-slate-500 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleDelete(confirmDelete)}
                className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-300 transition hover:bg-rose-500/20"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk delete confirm */}
      {confirmBulkDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
          <div className="panel-surface w-full max-w-sm space-y-4 p-6">
            <h3 className="text-lg font-semibold text-white">Delete {selectedIds.size} items?</h3>
            <p className="text-sm text-slate-300">
              Are you sure you want to delete {selectedIds.size} selected media items? This action
              cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmBulkDelete(false)}
                className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-400 transition hover:border-slate-500 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleBulkDelete()}
                className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-300 transition hover:bg-rose-500/20"
              >
                Delete {selectedIds.size} items
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
