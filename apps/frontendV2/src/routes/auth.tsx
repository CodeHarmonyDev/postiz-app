import { Outlet, createFileRoute } from '@tanstack/react-router'
import { AuthLayout } from '../features/auth/auth-layout'

export const Route = createFileRoute('/auth')({
  validateSearch: (search) => ({
    returnTo: typeof search.returnTo === 'string' ? search.returnTo : undefined,
  }),
  component: AuthRoute,
})

function AuthRoute() {
  const search = Route.useSearch()

  return (
    <AuthLayout returnTo={search.returnTo}>
      <Outlet />
    </AuthLayout>
  )
}
