import { Outlet, createRootRouteWithContext } from '@tanstack/react-router'
import type { AppRouterContext } from '../app/router-context'

export const Route = createRootRouteWithContext<AppRouterContext>()({
  component: () => (
    <div className="min-h-screen">
      <Outlet />
    </div>
  ),
})
