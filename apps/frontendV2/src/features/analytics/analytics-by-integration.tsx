import clsx from 'clsx'
import type { IntegrationMetric } from './use-analytics'

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="panel-soft flex animate-pulse items-center gap-4 p-4">
          <div className="h-10 w-10 rounded-xl bg-slate-800" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-32 rounded bg-slate-800" />
            <div className="h-3 w-48 rounded bg-slate-800/60" />
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="panel-soft p-8 text-center">
      <p className="text-sm font-semibold text-slate-300">No integrations connected</p>
      <p className="mt-1 text-xs text-slate-500">
        Connect social accounts to see per-integration analytics.
      </p>
    </div>
  )
}

function BreakdownBar({
  published,
  queued,
  drafts,
  errors,
  total,
}: {
  published: number
  queued: number
  drafts: number
  errors: number
  total: number
}) {
  if (total === 0) {
    return <div className="h-2 w-full rounded-full bg-slate-800/40" />
  }

  return (
    <div className="flex h-2 w-full overflow-hidden rounded-full">
      {published > 0 && (
        <div
          className="bg-emerald-400"
          style={{ width: `${(published / total) * 100}%` }}
        />
      )}
      {queued > 0 && (
        <div
          className="bg-sky-400"
          style={{ width: `${(queued / total) * 100}%` }}
        />
      )}
      {drafts > 0 && (
        <div
          className="bg-slate-500"
          style={{ width: `${(drafts / total) * 100}%` }}
        />
      )}
      {errors > 0 && (
        <div
          className="bg-rose-400"
          style={{ width: `${(errors / total) * 100}%` }}
        />
      )}
    </div>
  )
}

function StatBadge({
  count,
  label,
  variant,
}: {
  count: number
  label: string
  variant: 'emerald' | 'sky' | 'slate' | 'rose'
}) {
  if (count === 0) return null

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        variant === 'emerald' && 'bg-emerald-500/15 text-emerald-300',
        variant === 'sky' && 'bg-sky-500/15 text-sky-300',
        variant === 'slate' && 'bg-slate-500/15 text-slate-300',
        variant === 'rose' && 'bg-rose-500/15 text-rose-300',
      )}
    >
      {count} {label}
    </span>
  )
}

export function AnalyticsByIntegration({
  integrations,
  isLoading,
  isEmpty,
}: {
  integrations: Array<IntegrationMetric>
  isLoading: boolean
  isEmpty: boolean
}) {
  if (isLoading) {
    return <LoadingSkeleton />
  }

  if (isEmpty) {
    return <EmptyState />
  }

  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
        Posts by integration
      </p>

      <div className="space-y-3">
        {integrations.map((integration) => (
          <article
            key={integration.integrationId}
            className="panel-soft p-4 transition hover:border-slate-600"
          >
            <div className="flex items-start gap-4">
              <img
                src={integration.picture}
                alt={integration.integrationName}
                className="h-10 w-10 shrink-0 rounded-xl border border-slate-700/50 bg-slate-900 object-cover"
                onError={(event) => {
                  ;(event.target as HTMLImageElement).src = '/no-picture.jpg'
                }}
              />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-white">
                      {integration.integrationName}
                    </h4>
                    <p className="text-xs text-slate-500">
                      {integration.providerIdentifier}
                    </p>
                  </div>
                  <p className="text-lg font-bold text-white">
                    {integration.total}
                  </p>
                </div>

                <BreakdownBar
                  published={integration.published}
                  queued={integration.queued}
                  drafts={integration.drafts}
                  errors={integration.errors}
                  total={integration.total}
                />

                <div className="flex flex-wrap gap-1.5">
                  <StatBadge count={integration.published} label="published" variant="emerald" />
                  <StatBadge count={integration.queued} label="queued" variant="sky" />
                  <StatBadge count={integration.drafts} label="drafts" variant="slate" />
                  <StatBadge count={integration.errors} label="errors" variant="rose" />
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
