import clsx from 'clsx'
import type { OverviewMetrics } from './use-analytics'

function MetricCard({
  label,
  value,
  accent,
}: {
  label: string
  value: number
  accent?: 'sky' | 'emerald' | 'amber' | 'rose' | 'slate'
}) {
  const accentClass = {
    sky: 'text-sky-300',
    emerald: 'text-emerald-300',
    amber: 'text-amber-300',
    rose: 'text-rose-300',
    slate: 'text-slate-300',
  }[accent || 'slate']

  return (
    <div className="panel-soft p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className={clsx('mt-2 text-3xl font-bold tracking-tight', accentClass)}>
        {value.toLocaleString()}
      </p>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="panel-soft animate-pulse p-5">
          <div className="h-3 w-20 rounded bg-slate-800" />
          <div className="mt-3 h-8 w-16 rounded bg-slate-800/60" />
        </div>
      ))}
    </div>
  )
}

export function AnalyticsOverview({
  metrics,
  isLoading,
}: {
  metrics: OverviewMetrics | undefined
  isLoading: boolean
}) {
  if (isLoading || !metrics) {
    return <LoadingSkeleton />
  }

  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-300">
        Post metrics
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Total posts" value={metrics.totalPosts} accent="sky" />
        <MetricCard label="Published" value={metrics.published} accent="emerald" />
        <MetricCard label="Queued" value={metrics.queued} accent="amber" />
        <MetricCard label="Drafts" value={metrics.drafts} accent="slate" />
      </div>

      <p className="mt-2 text-xs font-semibold uppercase tracking-[0.22em] text-orange-300">
        Integration metrics
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Total integrations"
          value={metrics.totalIntegrations}
          accent="sky"
        />
        <MetricCard
          label="Active"
          value={metrics.activeIntegrations}
          accent="emerald"
        />
        <MetricCard
          label="Needs attention"
          value={metrics.needsAttentionIntegrations}
          accent={metrics.needsAttentionIntegrations > 0 ? 'rose' : 'slate'}
        />
        <MetricCard
          label="Errors"
          value={metrics.errors}
          accent={metrics.errors > 0 ? 'rose' : 'slate'}
        />
      </div>
    </div>
  )
}
