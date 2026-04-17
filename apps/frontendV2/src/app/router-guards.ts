import { redirect } from '@tanstack/react-router'

export function requireSignedIn({
  context,
  location,
}: {
  context: { auth: { isLoaded: boolean; isSignedIn: boolean } }
  location: { href: string }
}) {
  if (!context.auth.isLoaded || context.auth.isSignedIn) {
    return
  }

  throw redirect({
    to: '/auth/login',
    search: {
      returnTo: location.href,
    },
  })
}

export function redirectSignedInUser({
  context,
}: {
  context: { auth: { isLoaded: boolean; isSignedIn: boolean } }
}) {
  if (!context.auth.isLoaded || !context.auth.isSignedIn) {
    return
  }

  throw redirect({
    to: '/launches',
  })
}
