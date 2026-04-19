import { useState, useEffect } from 'react'
import clsx from 'clsx'
import type { MediaItem, MediaTag } from './use-media'

const TAG_COLORS = [
  '#3b82f6',
  '#f97316',
  '#22c55e',
  '#ef4444',
  '#a855f7',
  '#eab308',
  '#06b6d4',
  '#ec4899',
]

export function MediaTagModal({
  item,
  availableTags,
  onSave,
  onClose,
  onCreateTag,
}: {
  item: MediaItem
  availableTags: MediaTag[]
  onSave: (mediaId: string, tags: string[]) => void
  onClose: () => void
  onCreateTag: (name: string, color: string) => Promise<{ id: string } | null>
}) {
  const [selectedTags, setSelectedTags] = useState<string[]>(item.mediaTags || [])
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0])
  const [isCreating, setIsCreating] = useState(false)

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  function toggleTag(tagName: string) {
    setSelectedTags((prev) =>
      prev.includes(tagName) ? prev.filter((t) => t !== tagName) : [...prev, tagName],
    )
  }

  async function handleCreateTag() {
    if (!newTagName.trim()) return

    setIsCreating(true)
    const result = await onCreateTag(newTagName.trim(), newTagColor)

    if (result) {
      setSelectedTags((prev) => [...prev, newTagName.trim()])
      setNewTagName('')
    }
    setIsCreating(false)
  }

  function handleSave() {
    onSave(item.id, selectedTags)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="panel-surface w-full max-w-md space-y-5 p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Manage tags</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-700 px-2.5 py-1 text-xs text-slate-400 transition hover:border-slate-500 hover:text-white"
          >
            Close
          </button>
        </div>

        <p className="text-xs text-slate-500">
          Select tags for <span className="text-slate-300">{item.name}</span>
        </p>

        {/* Existing tags */}
        {availableTags.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Available tags
            </p>
            <div className="flex flex-wrap gap-2">
              {availableTags.map((tag) => {
                const isActive = selectedTags.includes(tag.name)
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleTag(tag.name)}
                    className={clsx(
                      'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition',
                      isActive
                        ? 'border-sky-400/60 bg-sky-400/15 text-white'
                        : 'border-slate-700 bg-slate-950/40 text-slate-400 hover:border-slate-500',
                    )}
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    {tag.name}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Create new tag */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Create new tag
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="Tag name"
              className="flex-1 rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white placeholder:text-slate-600 outline-none transition focus:border-sky-400"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void handleCreateTag()
                }
              }}
            />
            <button
              type="button"
              onClick={() => void handleCreateTag()}
              disabled={!newTagName.trim() || isCreating}
              className="rounded-xl bg-gradient-to-r from-sky-400 to-orange-400 px-3 py-2 text-xs font-semibold text-slate-950 transition hover:opacity-90 disabled:opacity-50"
            >
              Add
            </button>
          </div>
          <div className="flex gap-1.5">
            {TAG_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setNewTagColor(color)}
                className={clsx(
                  'h-5 w-5 rounded-full border-2 transition',
                  newTagColor === color ? 'border-white' : 'border-transparent',
                )}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-400 transition hover:border-slate-500 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="rounded-xl bg-gradient-to-r from-sky-400 to-orange-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:opacity-90"
          >
            Save tags
          </button>
        </div>
      </div>
    </div>
  )
}
