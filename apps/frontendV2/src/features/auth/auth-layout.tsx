import { useEffect, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { captureReturnTo } from '../../lib/auth'

export function AuthLayout({
  children,
  returnTo,
}: {
  children: ReactNode
  returnTo?: string
}) {
  useEffect(() => {
    captureReturnTo(returnTo)
  }, [returnTo])

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden px-6 py-10 lg:px-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.10),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(249,115,22,0.15),transparent_28%)]" />
      <div className="relative mx-auto grid w-full max-w-7xl flex-1 gap-6 lg:grid-cols-[1.2fr_0.9fr]">
        <section className="panel-soft flex flex-col justify-between overflow-hidden p-8 lg:p-12">
          <div className="space-y-8">
            <div className="space-y-4">
              <p className="eyebrow">Postiz Frontend V2</p>
              <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-white lg:text-6xl">
                Clerk custom auth and Convex-backed tenancy, rebuilt for Vite.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-slate-300">
                This workspace replaces the old Next.js auth shell with explicit client-side routing,
                route guards, and a viewer bootstrap that matches the Convex migration plan.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {[
                ['Session authority', 'Clerk owns sign-in, MFA, SSO, and password reset flows.'],
                ['Viewer bootstrap', 'Convex sync creates the user and default workspace after auth.'],
                ['Parallel rollout', 'Frontend V2 can run beside the legacy Next app while domains move.'],
              ].map(([title, body]) => (
                <article key={title} className="panel-surface p-5">
                  <p className="text-sm font-semibold text-white">{title}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{body}</p>
                </article>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 pt-10 text-sm text-slate-300">
            <Link
              to="/auth"
              search={{ returnTo: undefined }}
              className="rounded-full border border-slate-700/70 bg-slate-950/30 px-4 py-2 transition hover:border-sky-400 hover:text-white"
            >
              Create account
            </Link>
            <Link
              to="/auth/login"
              search={{ returnTo: undefined }}
              className="rounded-full border border-slate-700/70 bg-slate-950/30 px-4 py-2 transition hover:border-orange-400 hover:text-white"
            >
              Sign in
            </Link>
            <span className="text-xs uppercase tracking-[0.22em] text-slate-500">
              TanStack Router + Clerk React + Convex
            </span>
          </div>
        </section>
        <section className="panel-surface flex items-center p-6 sm:p-8 lg:p-10">{children}</section>
      </div>
    </main>
  )
}
