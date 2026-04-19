import { useState, useEffect } from 'react'
import type { MediaItem } from './use-media'

export function MediaEditModal({
  item,
  onSave,
  onClose,
}: {
  item: MediaItem
  onSave: (mediaId: string, updates: { name: string; alt: string }) => void
  onClose: () => void
}) {
  const [name, setName] = useState(item.name)
  const [alt, setAlt] = useState(item.alt || '')

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

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()

    if (!name.trim()) return

    onSave(item.id, { name: name.trim(), alt: alt.trim() })
  }

  const isImage = item.kind === 'image'
  const isVideo = item.kind === 'video'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="panel-surface w-full max-w-lg space-y-5 p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Edit media</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-700 px-2.5 py-1 text-xs text-slate-400 transition hover:border-slate-500 hover:text-white"
          >
            Close
          </button>
        </div>

        {/* Media preview */}
        {item.thumbnailUrl && (isImage || isVideo) && (
          <div className="overflow-hidden rounded-xl border border-slate-800">
            <img
              src={item.thumbnailUrl}
              alt={item.alt || item.name}
              className="h-48 w-full object-contain bg-slate-900/60"
            />
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="media-name"
              className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500"
            >
              Name
            </label>
            <input
              id="media-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-2.5 text-sm text-white outline-none transition focus:border-sky-400"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="media-alt"
              className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500"
            >
              Alt text
            </label>
            <input
              id="media-alt"
              type="text"
              value={alt}
              onChange={(event) => setAlt(event.target.value)}
              placeholder="Describe this media for accessibility"
              className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none transition focus:border-sky-400"
            />
          </div>

          {/* File info */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-500">Type: </span>
                <span className="text-slate-300">{item.kind}</span>
              </div>
              <div>
                <span className="text-slate-500">Size: </span>
                <span className="text-slate-300">
                  {item.fileSize < 1024 * 1024
                    ? `${(item.fileSize / 1024).toFixed(1)} KB`
                    : `${(item.fileSize / (1024 * 1024)).toFixed(1)} MB`}
                </span>
              </div>
              {item.originalName && (
                <div className="col-span-2">
                  <span className="text-slate-500">Original: </span>
                  <span className="text-slate-300">{item.originalName}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-400 transition hover:border-slate-500 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-gradient-to-r from-sky-400 to-orange-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:opacity-90"
            >
              Save changes
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
