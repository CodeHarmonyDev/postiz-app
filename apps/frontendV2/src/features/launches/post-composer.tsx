import { useEffect } from 'react'
import clsx from 'clsx'
import { usePostComposer, type ComposerMode } from './use-post-composer'
import type { DashboardIntegration } from '../integrations/use-integrations'
import type { Tag } from './use-tags'

const MODE_OPTIONS: Array<{ id: ComposerMode; label: string; description: string }> = [
  { id: 'schedule', label: 'Schedule', description: 'Pick a date and time' },
  { id: 'draft', label: 'Draft', description: 'Save without publishing' },
  { id: 'now', label: 'Post now', description: 'Publish immediately' },
]

const REPEAT_OPTIONS = [
  { value: undefined, label: 'No repeat' },
  { value: 1, label: 'Every day' },
  { value: 7, label: 'Every week' },
  { value: 14, label: 'Every 2 weeks' },
  { value: 30, label: 'Every 30 days' },
]

function IntegrationPicker({
  integrations,
  selectedIds,
  onToggle,
}: {
  integrations: DashboardIntegration[]
  selectedIds: string[]
  onToggle: (id: string) => void
}) {
  if (integrations.length === 0) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3 text-center">
        <p className="text-sm text-slate-400">No active integrations available.</p>
        <p className="mt-1 text-xs text-slate-600">
          Connect a social account from the Integrations page first.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        Channels
      </label>
      <div className="flex flex-wrap gap-2">
        {integrations.map((integration) => {
          const selected = selectedIds.includes(integration.id)
          return (
            <button
              key={integration.id}
              type="button"
              onClick={() => onToggle(integration.id)}
              className={clsx(
                'flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition',
                selected
                  ? 'border-sky-400/60 bg-sky-400/10 text-white'
                  : 'border-slate-800 bg-slate-950/30 text-slate-400 hover:border-slate-600 hover:text-slate-200',
              )}
            >
              <img
                src={integration.picture}
                alt={integration.name}
                className="h-6 w-6 rounded-md border border-slate-700/50 object-cover"
                onError={(e) => {
                  ;(e.target as HTMLImageElement).src = '/no-picture.jpg'
                }}
              />
              <span className="truncate max-w-[120px]">{integration.name}</span>
              <span className="text-xs text-slate-500">{integration.identifier}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function TagPicker({
  tags,
  selectedIds,
  onToggle,
}: {
  tags: Tag[]
  selectedIds: string[]
  onToggle: (id: string) => void
}) {
  if (tags.length === 0) return null

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        Tags
      </label>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag) => {
          const selected = selectedIds.includes(tag.id)
          return (
            <button
              key={tag.id}
              type="button"
              onClick={() => onToggle(tag.id)}
              className={clsx(
                'rounded-lg border px-2.5 py-1 text-xs font-medium transition',
                selected
                  ? 'opacity-100'
                  : 'opacity-50 hover:opacity-80',
              )}
              style={{
                backgroundColor: `${tag.color}${selected ? '30' : '15'}`,
                color: tag.color,
                borderColor: `${tag.color}${selected ? '60' : '30'}`,
              }}
            >
              {tag.name}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ContentEditor({
  values,
  onUpdateContent,
  onAdd,
  onRemove,
}: {
  values: Array<{ content: string }>
  onUpdateContent: (index: number, content: string) => void
  onAdd: () => void
  onRemove: (index: number) => void
}) {
  return (
    <div className="space-y-3">
      <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        Content
      </label>

      {values.map((value, index) => (
        <div key={index} className="relative">
          {values.length > 1 && (
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs text-slate-600">
                {index === 0 ? 'Main post' : `Thread reply ${index}`}
              </span>
              <button
                type="button"
                onClick={() => onRemove(index)}
                className="rounded-md px-1.5 py-0.5 text-xs text-slate-600 transition hover:bg-rose-500/10 hover:text-rose-300"
              >
                Remove
              </button>
            </div>
          )}
          <textarea
            value={value.content}
            onChange={(e) => onUpdateContent(index, e.target.value)}
            rows={index === 0 ? 5 : 3}
            placeholder={
              index === 0
                ? 'Write your post content...'
                : 'Continue the thread...'
            }
            className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm leading-relaxed text-white placeholder:text-slate-600 outline-none transition focus:border-sky-400 resize-none"
          />
          {index === 0 && (
            <div className="absolute bottom-3 right-3 text-xs text-slate-600">
              {value.content.length}
            </div>
          )}
        </div>
      ))}

      <button
        type="button"
        onClick={onAdd}
        className="flex items-center gap-1.5 rounded-xl border border-dashed border-slate-700 px-3 py-2 text-xs text-slate-500 transition hover:border-slate-500 hover:text-slate-300"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        Add thread reply
      </button>
    </div>
  )
}

export function PostComposer({ onClose }: { onClose: () => void }) {
  const {
    state,
    activeIntegrations,
    tags,
    nextSlot,
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
    clearError,
  } = usePostComposer()

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const success = await submit()
    if (success) onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/85 p-4 pt-[5vh]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="panel-surface w-full max-w-2xl space-y-6 p-6 sm:p-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-white">New post</h3>
            <p className="mt-1 text-sm text-slate-400">
              Compose and schedule content across your channels.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-700 px-2.5 py-1 text-xs text-slate-400 transition hover:border-slate-500 hover:text-white"
          >
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Mode selector */}
          <div className="flex gap-2">
            {MODE_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setMode(option.id)}
                className={clsx(
                  'rounded-xl border px-4 py-2 text-left transition',
                  state.mode === option.id
                    ? 'border-sky-400/60 bg-sky-400/10'
                    : 'border-slate-800 bg-slate-950/30 hover:border-slate-600',
                )}
              >
                <p
                  className={clsx(
                    'text-sm font-medium',
                    state.mode === option.id ? 'text-white' : 'text-slate-400',
                  )}
                >
                  {option.label}
                </p>
                <p className="text-xs text-slate-500">{option.description}</p>
              </button>
            ))}
          </div>

          {/* Integration picker */}
          <IntegrationPicker
            integrations={activeIntegrations}
            selectedIds={state.selectedIntegrationIds}
            onToggle={toggleIntegration}
          />

          {/* Content editor */}
          <ContentEditor
            values={state.values}
            onUpdateContent={updateContent}
            onAdd={addPostValue}
            onRemove={removePostValue}
          />

          {/* Schedule controls (hidden for "post now") */}
          {state.mode !== 'now' && (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                {/* Date */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="composer-date"
                    className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500"
                  >
                    Date
                  </label>
                  <input
                    id="composer-date"
                    type="date"
                    value={state.date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-2.5 text-sm text-white outline-none transition focus:border-sky-400"
                  />
                </div>

                {/* Time */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="composer-time"
                    className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500"
                  >
                    Time (UTC)
                  </label>
                  <input
                    id="composer-time"
                    type="time"
                    value={state.time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-2.5 text-sm text-white outline-none transition focus:border-sky-400"
                  />
                </div>
              </div>

              {/* Next available slot hint */}
              {nextSlot && state.mode === 'schedule' && (
                <button
                  type="button"
                  onClick={useNextSlot}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-800 px-3 py-1.5 text-xs text-slate-400 transition hover:border-sky-400/40 hover:text-sky-300"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Use next available slot:{' '}
                  <span className="font-medium text-sky-300">
                    {new Date(nextSlot).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true,
                      timeZone: 'UTC',
                    })} UTC
                  </span>
                </button>
              )}

              {/* Repeat interval */}
              <div className="space-y-1.5">
                <label
                  htmlFor="composer-repeat"
                  className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500"
                >
                  Repeat
                </label>
                <select
                  id="composer-repeat"
                  value={state.repeatIntervalDays ?? ''}
                  onChange={(e) =>
                    setRepeatInterval(e.target.value ? Number(e.target.value) : undefined)
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-sm text-white outline-none transition focus:border-sky-400 sm:w-auto"
                >
                  {REPEAT_OPTIONS.map((opt) => (
                    <option key={opt.label} value={opt.value ?? ''}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Tags */}
          <TagPicker
            tags={tags}
            selectedIds={state.selectedTagIds}
            onToggle={toggleTag}
          />

          {/* Short link toggle */}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={state.shortLink}
                onChange={(e) => setShortLink(e.target.checked)}
                className="h-4 w-4 rounded border-slate-600 bg-slate-950 text-sky-400 focus:ring-sky-400"
              />
              Shorten links in content
            </label>
          </div>

          {/* Error message */}
          {error && (
            <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-rose-300">{error}</p>
                <button
                  type="button"
                  onClick={clearError}
                  className="text-xs text-rose-400 hover:text-rose-200"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between border-t border-slate-800/60 pt-5">
            <div className="text-xs text-slate-500">
              {state.selectedIntegrationIds.length === 0
                ? 'Select at least one channel'
                : `${state.selectedIntegrationIds.length} channel${state.selectedIntegrationIds.length !== 1 ? 's' : ''} selected`}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm text-slate-400 transition hover:border-slate-500 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!canSubmit}
                className="rounded-xl bg-gradient-to-r from-sky-400 to-orange-400 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:opacity-90 disabled:opacity-40"
              >
                {isSubmitting
                  ? 'Creating...'
                  : state.mode === 'now'
                    ? 'Publish now'
                    : state.mode === 'draft'
                      ? 'Save draft'
                      : 'Schedule post'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
