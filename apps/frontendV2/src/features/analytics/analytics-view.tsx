import { useState } from 'react'
import clsx from 'clsx'
import { useAnalyticsOverview, usePostsByIntegration, usePostsOverTime } from './use-analytics'
import { AnalyticsOverview } from './analytics-overview'
import { PostsOverTimeChart } from './analytics-chart'
import { AnalyticsByIntegration } from './analytics-by-integration'

type TimeRange = 7 | 14 | 30 | 60

const timeRanges: Array<{ value: TimeRange; label: string }> = [
  { value: 7, label: '7 days' },
  { value: 14, label: '14 days' },
  { value: 30, label: '30 days' },
  { value: 60, label: '60 days' },
]

export function AnalyticsView() {
  const [days, setDays] = useState<TimeRange>(30)
  const overview = useAnalyticsOverview()
  const byIntegration = usePostsByIntegration()
  const overTime = usePostsOverTime(days)

  return (
    <div className="space-y-8">
      <AnalyticsOverview metrics={overview.metrics} isLoading={overview.isLoading} />

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            Activity trend
          </p>
          <div className="flex gap-1.5">
            {timeRanges.map((range) => (
              <button
                key={range.value}
                type="button"
                onClick={() => setDays(range.value)}
                className={clsx(
                  'rounded-lg border px-3 py-1 text-xs font-medium transition',
                  days === range.value
                    ? 'border-sky-400/60 bg-sky-400/10 text-sky-300'
                    : 'border-slate-800 bg-slate-950/30 text-slate-500 hover:border-slate-600 hover:text-slate-300',
                )}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>

        <PostsOverTimeChart data={overTime.data} isLoading={overTime.isLoading} />
      </div>

      <AnalyticsByIntegration
        integrations={byIntegration.integrations}
        isLoading={byIntegration.isLoading}
        isEmpty={byIntegration.isEmpty}
      />
    </div>
  )
}
