import { useState } from 'react'
import clsx from 'clsx'
import { useApiKeys, type ApiKey } from './use-settings'

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function formatRelative(timestamp: number) {
  const diff = Date.now() - timestamp
  const minutes = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days = Math.floor(diff / 86_400_000)

  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 30) return `${days}d ago`
  return formatDate(timestamp)
}

function KeyRow({
  apiKey,
  isAdmin,
  onRevoke,
}: {
  apiKey: ApiKey
  isAdmin: boolean
  onRevoke: (key: ApiKey) => void
}) {
  const isRevoked = !!apiKey.revokedAt

  return (
    <div
      className={clsx(
        'rounded-xl border px-4 py-3 transition',
        isRevoked
          ? 'border-slate-800/50 bg-slate-950/20 opacity-60'
          : 'border-slate-800 bg-slate-950/40',
      )}
    >
      <div className="flex items-center gap-3">
        {/* Key icon */}
        <div
          className={clsx(
            'flex h-8 w-8 items-center justify-center rounded-lg border',
            isRevoked
              ? 'border-slate-800 bg-slate-900/50 text-slate-600'
              : 'border-sky-400/30 bg-sky-400/10 text-sky-400',
          )}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
            />
          </svg>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <code className="text-sm font-mono text-white">{apiKey.prefix}...</code>
            {isRevoked && (
              <span className="rounded-md border border-rose-500/30 bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-rose-400">
                Revoked
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            {apiKey.description || 'No description'}
            {' '}&middot;{' '}
            Created {formatDate(apiKey.createdAt)}
            {apiKey.lastUsedAt && (
              <>{' '}&middot;{' '}Last used {formatRelative(apiKey.lastUsedAt)}</>
            )}
          </p>
        </div>

        {/* Scopes */}
        {apiKey.scopes.length > 0 && (
          <div className="hidden items-center gap-1 sm:flex">
            {apiKey.scopes.slice(0, 3).map((scope) => (
              <span
                key={scope}
                className="rounded-md border border-slate-700 bg-slate-800/50 px-1.5 py-0.5 text-[10px] text-slate-400"
              >
                {scope}
              </span>
            ))}
            {apiKey.scopes.length > 3 && (
              <span className="text-[10px] text-slate-600">
                +{apiKey.scopes.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Revoke button */}
        {isAdmin && !isRevoked && (
          <button
            type="button"
            onClick={() => onRevoke(apiKey)}
            className="rounded-lg border border-slate-800 px-3 py-1.5 text-xs text-slate-400 transition hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-300"
          >
            Revoke
          </button>
        )}
      </div>
    </div>
  )
}

export function ApiKeysSection() {
  const { keys, isLoading, isAdmin, revokeKey } = useApiKeys()
  const [confirmRevoke, setConfirmRevoke] = useState<ApiKey | null>(null)

  const activeKeys = keys.filter((k) => !k.revokedAt)
  const revokedKeys = keys.filter((k) => k.revokedAt)

  async function handleRevoke() {
    if (!confirmRevoke) return
    await revokeKey(confirmRevoke.id)
    setConfirmRevoke(null)
  }

  return (
    <section className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold text-white">API Keys</h3>
        <p className="mt-1 text-sm text-slate-400">
          {activeKeys.length} active key{activeKeys.length !== 1 ? 's' : ''}
          {revokedKeys.length > 0 && ` / ${revokedKeys.length} revoked`}
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="space-y-3 text-center">
            <div className="mx-auto h-1 w-32 overflow-hidden rounded-full bg-slate-800">
              <div className="h-full w-1/2 animate-pulse rounded-full bg-gradient-to-r from-sky-400 to-orange-400" />
            </div>
            <p className="text-sm text-slate-400">Loading API keys...</p>
          </div>
        </div>
      ) : keys.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-8 text-center">
          <p className="text-sm text-slate-400">No API keys yet.</p>
          <p className="mt-1 text-xs text-slate-600">
            API keys can be created from the backend to grant programmatic access.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {activeKeys.map((key) => (
            <KeyRow
              key={key.id}
              apiKey={key}
              isAdmin={isAdmin}
              onRevoke={setConfirmRevoke}
            />
          ))}

          {revokedKeys.length > 0 && (
            <details className="pt-2">
              <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 hover:text-slate-400">
                {revokedKeys.length} revoked key{revokedKeys.length !== 1 ? 's' : ''}
              </summary>
              <div className="mt-2 space-y-2">
                {revokedKeys.map((key) => (
                  <KeyRow
                    key={key.id}
                    apiKey={key}
                    isAdmin={isAdmin}
                    onRevoke={setConfirmRevoke}
                  />
                ))}
              </div>
            </details>
          )}
        </div>
      )}

      {/* Revoke confirmation modal */}
      {confirmRevoke && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
          <div className="panel-surface w-full max-w-sm space-y-4 p-6">
            <h3 className="text-lg font-semibold text-white">Revoke API key?</h3>
            <p className="text-sm text-slate-300">
              Are you sure you want to revoke key{' '}
              <code className="font-mono text-white">{confirmRevoke.prefix}...</code>?
              This action cannot be undone. Any integrations using this key will stop working.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmRevoke(null)}
                className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-400 transition hover:border-slate-500 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleRevoke()}
                className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-300 transition hover:bg-rose-500/20"
              >
                Revoke key
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
