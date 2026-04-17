const RETURN_TO_KEY = 'postiz.frontend-v2.return-to'

export const DEFAULT_AUTH_REDIRECT = '/launches'
export const AUTH_COMPLETE_PATH = '/auth/complete'
export const AUTH_SSO_CALLBACK_PATH = '/auth/sso-callback'

function normalizeReturnTo(value: string | null | undefined) {
  if (!value || typeof window === 'undefined') {
    return undefined
  }

  try {
    const url = new URL(value, window.location.origin)

    if (url.origin !== window.location.origin) {
      return undefined
    }

    return `${url.pathname}${url.search}${url.hash}` || DEFAULT_AUTH_REDIRECT
  } catch {
    return undefined
  }
}

export function captureReturnTo(value: string | null | undefined) {
  if (typeof window === 'undefined') {
    return
  }

  const nextValue = normalizeReturnTo(value)

  if (!nextValue) {
    return
  }

  window.localStorage.setItem(RETURN_TO_KEY, nextValue)
}

export function readReturnTo() {
  if (typeof window === 'undefined') {
    return DEFAULT_AUTH_REDIRECT
  }

  return normalizeReturnTo(window.localStorage.getItem(RETURN_TO_KEY)) || DEFAULT_AUTH_REDIRECT
}

export function consumeReturnTo() {
  if (typeof window === 'undefined') {
    return DEFAULT_AUTH_REDIRECT
  }

  const value = normalizeReturnTo(window.localStorage.getItem(RETURN_TO_KEY))
  window.localStorage.removeItem(RETURN_TO_KEY)
  return value || DEFAULT_AUTH_REDIRECT
}

export function getSsoCallbackUrl() {
  if (typeof window === 'undefined') {
    return AUTH_SSO_CALLBACK_PATH
  }

  return new URL(AUTH_SSO_CALLBACK_PATH, window.location.origin).toString()
}
