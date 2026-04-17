import { beforeEach, describe, expect, it } from 'vitest'
import { captureReturnTo, consumeReturnTo, readReturnTo } from './auth'

describe('auth return-to helpers', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('stores same-origin relative destinations', () => {
    captureReturnTo('/launches?tab=calendar')

    expect(readReturnTo()).toBe('/launches?tab=calendar')
  })

  it('ignores cross-origin destinations', () => {
    captureReturnTo('https://example.com/steal-session')

    expect(readReturnTo()).toBe('/launches')
  })

  it('consumes the stored destination once', () => {
    captureReturnTo('/settings')

    expect(consumeReturnTo()).toBe('/settings')
    expect(readReturnTo()).toBe('/launches')
  })
})
