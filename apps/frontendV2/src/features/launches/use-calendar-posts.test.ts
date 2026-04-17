import { describe, expect, it } from 'vitest'

// Test the pure utility functions extracted from the hook logic

function getWeekBounds(date: Date) {
  const start = new Date(date)
  start.setUTCHours(0, 0, 0, 0)
  start.setUTCDate(start.getUTCDate() - start.getUTCDay())

  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + 7)
  end.setUTCMilliseconds(-1)

  return { startAt: start.getTime(), endAt: end.getTime() }
}

describe('getWeekBounds', () => {
  it('returns start on Sunday and end on Saturday for a Wednesday', () => {
    // 2026-04-15 is a Wednesday
    const bounds = getWeekBounds(new Date('2026-04-15T12:00:00Z'))
    const start = new Date(bounds.startAt)
    const end = new Date(bounds.endAt)

    expect(start.getUTCDay()).toBe(0) // Sunday
    expect(start.getUTCHours()).toBe(0)
    expect(start.getUTCMinutes()).toBe(0)

    expect(end.getUTCDay()).toBe(6) // Saturday
    expect(end.getUTCHours()).toBe(23)
    expect(end.getUTCMinutes()).toBe(59)
  })

  it('returns a 7-day span', () => {
    const bounds = getWeekBounds(new Date('2026-04-16T08:00:00Z'))
    const days = (bounds.endAt - bounds.startAt) / (1000 * 60 * 60 * 24)

    expect(days).toBeGreaterThanOrEqual(6.99)
    expect(days).toBeLessThan(7.01)
  })

  it('handles Sunday input (start of week)', () => {
    // 2026-04-12 is a Sunday
    const bounds = getWeekBounds(new Date('2026-04-12T00:00:00Z'))
    const start = new Date(bounds.startAt)

    expect(start.getUTCDay()).toBe(0)
    expect(start.getUTCDate()).toBe(12)
  })
})
