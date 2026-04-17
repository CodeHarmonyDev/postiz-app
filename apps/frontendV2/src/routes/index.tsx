import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  beforeLoad: ({ context }) => {
    if (!context.auth.isLoaded) {
      return
    }

    throw redirect({
      to: context.auth.isSignedIn ? '/launches' : '/auth/login',
    })
  },
  component: Index,
})

function Index() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="panel-surface max-w-lg space-y-4 p-8 text-center">
        <p className="eyebrow">Frontend V2</p>
        <h1 className="text-3xl font-semibold tracking-tight text-white">
          Loading the new Postiz workspace shell.
        </h1>
        <p className="text-sm text-slate-300">
          TanStack Router is resolving your session and choosing the right entry
          point.
        </p>
      </div>
    </main>
  )
}
