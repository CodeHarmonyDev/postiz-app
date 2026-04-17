import clsx from 'clsx'
import type { CalendarPost } from './use-calendar-posts'

function formatTime(isoDate: string) {
  const date = new Date(isoDate)
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'UTC',
  })
}

const stateStyles: Record<CalendarPost['state'], { label: string; className: string }> = {
  QUEUE: { label: 'Queued', className: 'bg-sky-500/15 text-sky-300' },
  PUBLISHED: { label: 'Published', className: 'bg-emerald-500/15 text-emerald-300' },
  ERROR: { label: 'Error', className: 'bg-rose-500/15 text-rose-300' },
  DRAFT: { label: 'Draft', className: 'bg-slate-500/15 text-slate-300' },
}

export function PostCard({ post, compact }: { post: CalendarPost; compact?: boolean }) {
  const state = stateStyles[post.state]
  const contentPreview = post.content.length > 120
    ? `${post.content.slice(0, 120)}...`
    : post.content

  return (
    <article
      className={clsx(
        'panel-soft transition hover:border-slate-600',
        compact ? 'p-3' : 'p-4',
      )}
    >
      <div className="flex items-start gap-3">
        <img
          src={post.integration.picture}
          alt={post.integration.name}
          className="h-8 w-8 shrink-0 rounded-lg border border-slate-700/50 bg-slate-900 object-cover"
          onError={(event) => {
            ;(event.target as HTMLImageElement).src = '/no-picture.jpg'
          }}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-xs font-medium text-slate-300">
              {post.integration.name}
            </span>
            <span className="text-xs text-slate-500">{post.integration.providerIdentifier}</span>
            <span className={clsx('ml-auto shrink-0 rounded-full px-2 py-0.5 text-xs font-medium', state.className)}>
              {state.label}
            </span>
          </div>
          <p className={clsx('mt-1 text-sm leading-relaxed text-slate-200', compact && 'line-clamp-2')}>
            {contentPreview}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-500">{formatTime(post.publishDate)}</span>
            {post.intervalInDays ? (
              <span className="rounded-md border border-slate-800 px-1.5 py-0.5 text-xs text-slate-400">
                Repeats every {post.intervalInDays}d
              </span>
            ) : null}
            {post.tags.map(({ tag }) => (
              <span
                key={tag.id}
                className="rounded-md px-1.5 py-0.5 text-xs font-medium"
                style={{
                  backgroundColor: `${tag.color}22`,
                  color: tag.color,
                  border: `1px solid ${tag.color}44`,
                }}
              >
                {tag.name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </article>
  )
}
