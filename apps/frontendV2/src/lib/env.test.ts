import { describe, expect, it } from 'vitest'
import { runtimeEnv } from './env'

describe('runtimeEnv', () => {
  it('exports expected shape', () => {
    expect(runtimeEnv).toHaveProperty('clerkPublishableKey')
    expect(runtimeEnv).toHaveProperty('convexUrl')
    expect(runtimeEnv).toHaveProperty('sentryDsn')
    expect(runtimeEnv).toHaveProperty('disableRegistration')
  })

  it('disableRegistration defaults to false', () => {
    expect(runtimeEnv.disableRegistration).toBe(false)
  })
})
