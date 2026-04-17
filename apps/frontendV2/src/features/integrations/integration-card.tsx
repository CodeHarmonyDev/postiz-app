import clsx from 'clsx'
import type { DashboardIntegration } from './use-integrations'

function formatPostingTime(minutesSinceMidnight: number) {
  const hours = Math.floor(minutesSinceMidnight / 60)
  const minutes = minutesSinceMidnight % 60
  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHour = hours % 12 || 12

  return `${displayHour}:${String(minutes).padStart(2, '0')} ${period}`
}

function StatusBadge({ label, variant }: { label: string; variant: 'ok' | 'warn' | 'error' }) {
  return (
    <span
      className={clsx(
        'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium',
        variant === 'ok' && 'bg-emerald-500/15 text-emerald-300',
        variant === 'warn' && 'bg-amber-500/15 text-amber-300',
        variant === 'error' && 'bg-rose-500/15 text-rose-300',
      )}
    >
      {label}
    </span>
  )
}

export function IntegrationCard({ integration }: { integration: DashboardIntegration }) {
  const status = integration.refreshNeeded
    ? { label: 'Reconnect needed', variant: 'error' as const }
    : integration.disabled
      ? { label: 'Disabled', variant: 'warn' as const }
      : integration.inBetweenSteps
        ? { label: 'Setup incomplete', variant: 'warn' as const }
        : { label: 'Active', variant: 'ok' as const }

  return (
    <article className="panel-soft flex flex-col gap-4 p-5 transition hover:border-slate-600">
      <div className="flex items-start gap-4">
        <img
          src={integration.picture}
          alt={integration.name}
          className="h-11 w-11 shrink-0 rounded-xl border border-slate-700/50 bg-slate-900 object-cover"
          onError={(event) => {
            ;(event.target as HTMLImageElement).src = '/no-picture.jpg'
          }}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-white">{integration.name}</h3>
            <StatusBadge label={status.label} variant={status.variant} />
          </div>
          <p className="mt-0.5 text-xs text-slate-400">
            {integration.identifier}
            {integration.display ? ` \u00b7 ${integration.display}` : ''}
          </p>
        </div>
        <span
          className={clsx(
            'shrink-0 rounded-lg border px-2 py-0.5 text-xs font-medium uppercase tracking-wider',
            integration.type === 'social'
              ? 'border-sky-500/30 text-sky-300'
              : 'border-orange-500/30 text-orange-300',
          )}
        >
          {integration.type}
        </span>
      </div>

      {integration.customer ? (
        <div className="rounded-xl border border-slate-800/60 bg-slate-950/40 px-3 py-2 text-xs text-slate-300">
          Customer: <span className="font-medium text-white">{integration.customer.name}</span>
        </div>
      ) : null}

      {integration.time.length > 0 ? (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Posting schedule
          </p>
          <div className="flex flex-wrap gap-1.5">
            {integration.time.map((slot) => (
              <span
                key={slot.time}
                className="rounded-lg border border-slate-800 bg-slate-950/50 px-2 py-0.5 text-xs text-slate-300"
              >
                {formatPostingTime(slot.time)}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </article>
  )
}
