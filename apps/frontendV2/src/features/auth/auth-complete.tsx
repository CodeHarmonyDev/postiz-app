import { useEffect, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useUser } from '@clerk/react'
import { useConvexAuth, useMutation } from 'convex/react'
import { api } from '@gitroom/convex/_generated/api'
import { consumeReturnTo, readReturnTo } from '../../lib/auth'

type CompletionState =
  | 'loading'
  | 'convex-auth-not-ready'
  | 'convex-sync-failed'

export function AuthCompleteScreen() {
  const { isSignedIn } = useUser()
  const { isAuthenticated, isLoading } = useConvexAuth()
  const syncViewer = useMutation(api.users.syncViewer)
  const hasAttemptedRef = useRef(false)
  const [details, setDetails] = useState('')
  const target = readReturnTo()

  useEffect(() => {
    if (!isSignedIn) {
      window.location.assign('/auth/login')
      return
    }

    if (isLoading) {
      return
    }

    if (!isAuthenticated) {
      return
    }

    if (hasAttemptedRef.current) {
      return
    }

    hasAttemptedRef.current = true

    void syncViewer({})
      .then(() => {
        window.location.assign(consumeReturnTo())
      })
      .catch((error: unknown) => {
        hasAttemptedRef.current = false
        setDetails(error instanceof Error ? error.message : String(error))
      })
  }, [isAuthenticated, isLoading, isSignedIn, syncViewer])

  const state: CompletionState = details
    ? 'convex-sync-failed'
    : !isAuthenticated && !isLoading
      ? 'convex-auth-not-ready'
      : 'loading'

  if (state === 'loading') {
    return (
      <div className="w-full space-y-6">
        <div className="space-y-3">
          <p className="eyebrow">Finishing Sign In</p>
          <h2 className="text-3xl font-semibold tracking-tight text-white">Syncing your Clerk session with Convex.</h2>
          <p className="text-sm leading-6 text-slate-300">
            We are creating or refreshing your viewer state before routing you to{' '}
            <span className="font-semibold text-white">{target}</span>.
          </p>
        </div>
        <div className="overflow-hidden rounded-full bg-slate-900/80">
          <div className="h-2 w-1/3 animate-pulse rounded-full bg-gradient-to-r from-sky-400 to-orange-400" />
        </div>
      </div>
    )
  }

  const title =
    state === 'convex-auth-not-ready'
      ? 'Convex auth is not ready for this Clerk session yet.'
      : 'The viewer sync step could not finish.'

  const body =
    state === 'convex-auth-not-ready'
      ? 'Clerk finished signing you in, but Convex is not accepting the token yet. Verify the Clerk issuer configuration before retrying.'
      : 'Clerk auth succeeded, but the frontend could not create or refresh the current viewer state in Convex.'

  return (
    <div className="w-full space-y-6">
      <div className="space-y-3">
        <p className="eyebrow">Auth Completion</p>
        <h2 className="text-3xl font-semibold tracking-tight text-white">{title}</h2>
        <p className="text-sm leading-6 text-slate-300">{body}</p>
      </div>
      {details ? (
        <div className="rounded-2xl border border-slate-700 bg-slate-950/60 px-4 py-4 text-sm text-slate-300">
          {details}
        </div>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-2xl bg-gradient-to-r from-sky-400 to-orange-400 px-4 py-3 text-sm font-semibold text-slate-950"
        >
          Retry sync
        </button>
        <Link
          to="/auth/login"
          search={{ returnTo: undefined }}
          className="rounded-2xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm text-white"
        >
          Back to sign in
        </Link>
      </div>
    </div>
  )
}
