import { useMemo } from 'react'
import clsx from 'clsx'
import type { DayMetric } from './use-analytics'

function LoadingSkeleton() {
  return (
    <div className="panel-soft animate-pulse p-5">
      <div className="h-3 w-32 rounded bg-slate-800" />
      <div className="mt-4 flex items-end gap-1">
        {Array.from({ length: 14 }).map((_, index) => (
          <div
            key={index}
            className="flex-1 rounded-t bg-slate-800/40"
            style={{ height: `${20 + Math.random() * 60}px` }}
          />
        ))}
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="panel-soft p-8 text-center">
      <p className="text-sm font-semibold text-slate-300">No post activity yet</p>
      <p className="mt-1 text-xs text-slate-500">
        Post activity data will appear here once posts are created.
      </p>
    </div>
  )
}

export function PostsOverTimeChart({
  data,
  isLoading,
}: {
  data: Array<DayMetric>
  isLoading: boolean
}) {
  const maxTotal = useMemo(
    () => Math.max(1, ...data.map((d) => d.total)),
    [data],
  )

  if (isLoading) {
    return <LoadingSkeleton />
  }

  if (data.length === 0 || data.every((d) => d.total === 0)) {
    return <EmptyState />
  }

  return (
    <div className="panel-soft p-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
          Posts over time
        </p>
        <div className="flex gap-3">
          {[
            { label: 'Published', className: 'bg-emerald-400' },
            { label: 'Queued', className: 'bg-sky-400' },
            { label: 'Draft', className: 'bg-slate-500' },
            { label: 'Error', className: 'bg-rose-400' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <div className={clsx('h-2 w-2 rounded-full', item.className)} />
              <span className="text-xs text-slate-500">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-end gap-[2px]" style={{ height: '160px' }}>
        {data.map((day) => {
          const publishedHeight = (day.published / maxTotal) * 100
          const queuedHeight = (day.queued / maxTotal) * 100
          const draftsHeight = (day.drafts / maxTotal) * 100
          const errorsHeight = (day.errors / maxTotal) * 100

          return (
            <div
              key={day.date}
              className="group relative flex flex-1 flex-col items-stretch justify-end"
              style={{ height: '100%' }}
            >
              <div className="pointer-events-none absolute -top-8 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-white shadow-lg group-hover:block">
                {day.date}: {day.total} post{day.total !== 1 ? 's' : ''}
              </div>

              {day.total === 0 ? (
                <div className="w-full rounded-t bg-slate-800/20" style={{ height: '2px' }} />
              ) : (
                <div className="flex w-full flex-col justify-end rounded-t transition-opacity hover:opacity-80" style={{ height: '100%' }}>
                  {errorsHeight > 0 && (
                    <div
                      className="w-full bg-rose-400/80"
                      style={{ height: `${errorsHeight}%`, minHeight: '2px' }}
                    />
                  )}
                  {draftsHeight > 0 && (
                    <div
                      className="w-full bg-slate-500/80"
                      style={{ height: `${draftsHeight}%`, minHeight: '2px' }}
                    />
                  )}
                  {queuedHeight > 0 && (
                    <div
                      className="w-full bg-sky-400/80"
                      style={{ height: `${queuedHeight}%`, minHeight: '2px' }}
                    />
                  )}
                  {publishedHeight > 0 && (
                    <div
                      className="w-full rounded-t bg-emerald-400/80"
                      style={{ height: `${publishedHeight}%`, minHeight: '2px' }}
                    />
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-2 flex justify-between text-xs text-slate-600">
        <span>{data[0]?.date}</span>
        <span>{data[data.length - 1]?.date}</span>
      </div>
    </div>
  )
}
