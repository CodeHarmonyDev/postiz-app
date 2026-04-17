import { createRouter } from '@tanstack/react-router'
import { routeTree } from '../routeTree.gen'
import { fallbackRouterAuthContext } from './router-context'

export const router = createRouter({
  routeTree,
  context: {
    auth: fallbackRouterAuthContext,
  },
  defaultPreload: 'intent',
  scrollRestoration: true,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
