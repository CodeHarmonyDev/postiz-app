import { useIntegrations } from './use-integrations'
import { IntegrationCard } from './integration-card'

function EmptyState() {
  return (
    <div className="panel-soft p-8 text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-sky-300">
        No integrations yet
      </p>
      <h3 className="mt-3 text-xl font-semibold tracking-tight text-white">
        Connect your first social account or publishing channel.
      </h3>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-300">
        Integrations are managed through provider connect flows. Once connected,
        they appear here and can be used in the launches composer.
      </p>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="panel-soft animate-pulse space-y-3 p-5"
        >
          <div className="flex items-center gap-4">
            <div className="h-11 w-11 rounded-xl bg-slate-800" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 rounded bg-slate-800" />
              <div className="h-3 w-48 rounded bg-slate-800/60" />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="h-5 w-16 rounded-lg bg-slate-800/50" />
            <div className="h-5 w-16 rounded-lg bg-slate-800/50" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function IntegrationsList() {
  const { integrations, isLoading, isEmpty } = useIntegrations()

  if (isLoading) {
    return <LoadingState />
  }

  if (isEmpty) {
    return <EmptyState />
  }

  const active = integrations.filter((i) => !i.disabled && !i.refreshNeeded)
  const needsAttention = integrations.filter((i) => i.disabled || i.refreshNeeded)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">
          {integrations.length} integration{integrations.length !== 1 ? 's' : ''} connected
          {needsAttention.length > 0 ? (
            <span className="ml-2 text-amber-300">
              ({needsAttention.length} need{needsAttention.length !== 1 ? '' : 's'} attention)
            </span>
          ) : null}
        </p>
      </div>

      {needsAttention.length > 0 ? (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">
            Needs attention
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {needsAttention.map((integration) => (
              <IntegrationCard key={integration.id} integration={integration} />
            ))}
          </div>
        </div>
      ) : null}

      {active.length > 0 ? (
        <div className="space-y-3">
          {needsAttention.length > 0 ? (
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Active
            </p>
          ) : null}
          <div className="grid gap-4 md:grid-cols-2">
            {active.map((integration) => (
              <IntegrationCard key={integration.id} integration={integration} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
