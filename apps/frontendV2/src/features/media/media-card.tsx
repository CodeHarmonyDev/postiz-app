import { useState } from 'react'
import clsx from 'clsx'
import type { MediaItem } from './use-media'

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function KindBadge({ kind }: { kind: string }) {
  return (
    <span
      className={clsx(
        'inline-flex rounded-full px-2 py-0.5 text-xs font-medium uppercase tracking-wider',
        kind === 'image' && 'bg-sky-500/15 text-sky-300',
        kind === 'video' && 'bg-orange-500/15 text-orange-300',
        kind !== 'image' && kind !== 'video' && 'bg-slate-500/15 text-slate-300',
      )}
    >
      {kind}
    </span>
  )
}

export function MediaCard({
  item,
  onEdit,
  onDelete,
  onTagEdit,
  isSelected,
  onToggleSelect,
  selectionMode,
}: {
  item: MediaItem
  onEdit: (item: MediaItem) => void
  onDelete: (item: MediaItem) => void
  onTagEdit?: (item: MediaItem) => void
  isSelected?: boolean
  onToggleSelect?: (item: MediaItem) => void
  selectionMode?: boolean
}) {
  const [imageError, setImageError] = useState(false)
  const isImage = item.kind === 'image'
  const isVideo = item.kind === 'video'
  const hasPreview = (isImage || isVideo) && item.thumbnailUrl && !imageError

  function handleCardClick() {
    if (selectionMode && onToggleSelect) {
      onToggleSelect(item)
    }
  }

  return (
    <article
      onClick={handleCardClick}
      className={clsx(
        'panel-soft group flex flex-col overflow-hidden transition',
        selectionMode
          ? 'cursor-pointer'
          : 'hover:border-slate-600',
        isSelected && 'border-sky-400/60 ring-1 ring-sky-400/40',
      )}
    >
      <div className="relative aspect-video w-full overflow-hidden bg-slate-900/60">
        {/* Selection checkbox */}
        {(selectionMode || isSelected) && (
          <div className="absolute left-2 top-2 z-10">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onToggleSelect?.(item)
              }}
              className={clsx(
                'flex h-5 w-5 items-center justify-center rounded border transition',
                isSelected
                  ? 'border-sky-400 bg-sky-400 text-slate-950'
                  : 'border-slate-500 bg-slate-900/80 text-transparent hover:border-sky-400',
              )}
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </button>
          </div>
        )}

        {hasPreview ? (
          <img
            src={item.thumbnailUrl}
            alt={item.alt || item.name}
            className="h-full w-full object-cover transition group-hover:scale-105"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="text-3xl text-slate-600">
              {isImage ? '\u{1F5BC}' : isVideo ? '\u{1F3AC}' : '\u{1F4C4}'}
            </span>
          </div>
        )}

        {!selectionMode && (
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-slate-950/70 opacity-0 transition group-hover:opacity-100">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onEdit(item)
              }}
              className="rounded-xl border border-slate-600 bg-slate-900/80 px-3 py-1.5 text-xs font-medium text-white transition hover:border-sky-400 hover:text-sky-300"
            >
              Edit
            </button>
            {onTagEdit && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onTagEdit(item)
                }}
                className="rounded-xl border border-slate-600 bg-slate-900/80 px-3 py-1.5 text-xs font-medium text-white transition hover:border-orange-400 hover:text-orange-300"
              >
                Tags
              </button>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(item)
              }}
              className="rounded-xl border border-slate-600 bg-slate-900/80 px-3 py-1.5 text-xs font-medium text-white transition hover:border-rose-400 hover:text-rose-300"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="line-clamp-1 text-sm font-medium text-white" title={item.name}>
            {item.name}
          </p>
          <KindBadge kind={item.kind} />
        </div>

        {item.mediaTags && item.mediaTags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {item.mediaTags.map((tag) => (
              <span
                key={tag}
                className="inline-flex rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {item.alt ? (
          <p className="line-clamp-1 text-xs text-slate-400" title={item.alt}>
            {item.alt}
          </p>
        ) : null}

        <div className="mt-auto flex items-center gap-3 text-xs text-slate-500">
          <span>{formatFileSize(item.fileSize)}</span>
          <span>{formatDate(item.createdAt)}</span>
        </div>
      </div>
    </article>
  )
}
