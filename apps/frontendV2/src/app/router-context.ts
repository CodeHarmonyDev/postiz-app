export type RouterAuthContext = {
  hasClerk: boolean
  isLoaded: boolean
  isSignedIn: boolean
}

export type AppRouterContext = {
  auth: RouterAuthContext
}

export const fallbackRouterAuthContext: RouterAuthContext = {
  hasClerk: false,
  isLoaded: true,
  isSignedIn: false,
}
