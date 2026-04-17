import clsx from 'clsx'
import { Link, useLocation } from '@tanstack/react-router'
import { useClerk } from '@clerk/react'
import { runtimeEnv } from '../../lib/env'
import { RuntimeConfigNotice } from '../../components/runtime-config-notice'
import { useAppViewer } from './use-app-viewer'

const navigation = [
  {
    href: '/launches',
    label: 'Launches',
    caption: 'Calendar and post queue',
  },
  {
    href: '/integrations',
    label: 'Integrations',
    caption: 'Connected channels',
  },
  {
    href: '/analytics',
    label: 'Analytics',
    caption: 'Performance reporting',
  },
  {
    href: '/media',
    label: 'Media',
    caption: 'Uploads and assets',
  },
  {
    href: '/settings',
    label: 'Settings',
    caption: 'Workspace and team',
  },
] as const

function UserAvatar({ imageUrl, name }: { imageUrl?: string; name: string }) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={name}
        className="h-9 w-9 rounded-full border border-slate-700/50 object-cover"
      />
    )
  }

  const initials = name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-700/50 bg-gradient-to-br from-sky-500/20 to-orange-500/20 text-xs font-bold text-white">
      {initials || '?'}
    </div>
  )
}

function AppShellInner({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  const location = useLocation()
  const { signOut } = useClerk()
  const { viewer, organizations, isLoading, needsSync, retrySync, setDefaultOrganization } =
    useAppViewer()

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 py-10">
        <div className="panel-surface w-full max-w-xl space-y-5 p-8 text-center">
          <p className="eyebrow">Loading</p>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Setting up your workspace...
          </h1>
          <div className="mx-auto h-1 w-32 overflow-hidden rounded-full bg-slate-800">
            <div className="h-full w-1/3 animate-pulse rounded-full bg-gradient-to-r from-sky-400 to-orange-400" />
          </div>
        </div>
      </main>
    )
  }

  if (needsSync || !viewer) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 py-10">
        <div className="panel-surface w-full max-w-xl space-y-5 p-8">
          <p className="eyebrow">Viewer Sync</p>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Your workspace record is being created.
          </h1>
          <p className="text-sm leading-6 text-slate-300">
            Clerk sign-in succeeded but Convex has not finished provisioning your user or default
            organization yet.
          </p>
          <button
            type="button"
            onClick={() => void retrySync()}
            className="rounded-2xl bg-gradient-to-r from-sky-400 to-orange-400 px-4 py-3 text-sm font-semibold text-slate-950"
          >
            Retry viewer sync
          </button>
        </div>
      </main>
    )
  }

  const displayName =
    viewer.user.fullName ||
    [viewer.user.firstName, viewer.user.lastName].filter(Boolean).join(' ') ||
    viewer.user.email ||
    'Postiz member'

  const subscriptionLabel = viewer.subscription
    ? `${viewer.subscription.tier} plan`
    : 'No subscription'

  return (
    <main className="min-h-screen px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="panel-surface flex flex-col gap-5 p-5">
          {/* Brand header */}
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-orange-400">
              <span className="text-sm font-bold text-slate-950">P</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Postiz</p>
              <p className="text-xs text-slate-500">Frontend V2</p>
            </div>
          </div>

          {/* User card */}
          <div className="panel-soft space-y-3 p-4">
            <div className="flex items-center gap-3">
              <UserAvatar imageUrl={viewer.user.imageUrl} name={displayName} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{displayName}</p>
                <p className="truncate text-xs text-slate-500">
                  {viewer.user.email || 'No email'}
                </p>
              </div>
            </div>

            {/* Organization switcher */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Workspace
              </label>
              <select
                value={String(viewer.organization._id)}
                onChange={(event) =>
                  void setDefaultOrganization(event.target.value as typeof viewer.organization._id)
                }
                className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-sky-400"
              >
                {organizations.map((organization) => (
                  <option key={String(organization.id)} value={String(organization.id)}>
                    {organization.name}
                  </option>
                ))}
              </select>
            </div>

            <p className="text-xs text-slate-500">
              {viewer.membership.role} &middot; {subscriptionLabel}
            </p>
          </div>

          {/* Navigation */}
          <nav className="space-y-1.5">
            {navigation.map((item) => {
              const active = location.pathname === item.href

              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={clsx(
                    'block rounded-xl border px-4 py-2.5 transition',
                    active
                      ? 'border-sky-400/60 bg-sky-400/10'
                      : 'border-transparent hover:border-slate-700 hover:bg-slate-950/30',
                  )}
                >
                  <p className={clsx('text-sm font-medium', active ? 'text-white' : 'text-slate-300')}>
                    {item.label}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">{item.caption}</p>
                </Link>
              )
            })}
          </nav>

          {/* Sign out */}
          <div className="mt-auto pt-2">
            <button
              type="button"
              onClick={() => void signOut({ redirectUrl: '/auth/login' })}
              className="w-full rounded-xl border border-slate-800 px-4 py-2.5 text-left text-sm text-slate-400 transition hover:border-slate-600 hover:text-slate-200"
            >
              Sign out
            </button>
          </div>
        </aside>

        <section className="panel-surface overflow-hidden">
          <header className="border-b border-slate-800/80 px-6 py-5 sm:px-8">
            <h2 className="text-2xl font-semibold tracking-tight text-white">{title}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">{description}</p>
          </header>
          <div className="p-6 sm:p-8">{children}</div>
        </section>
      </div>
    </main>
  )
}

export function AuthenticatedAppPage({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  if (!runtimeEnv.clerkPublishableKey) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 py-10">
        <RuntimeConfigNotice
          title="Clerk is required for protected routes."
          description="Set a Clerk publishable key to enable authentication in Frontend V2."
          variables={[
            'VITE_CLERK_PUBLISHABLE_KEY',
            'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
          ]}
        />
      </main>
    )
  }

  if (!runtimeEnv.convexUrl) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 py-10">
        <RuntimeConfigNotice
          title="Convex is required for the app shell."
          description="Viewer state, organization data, and all migrated domain surfaces come from Convex."
          variables={[
            'VITE_CONVEX_URL',
            'NEXT_PUBLIC_CONVEX_URL',
          ]}
        />
      </main>
    )
  }

  return (
    <AppShellInner title={title} description={description}>
      {children}
    </AppShellInner>
  )
}
