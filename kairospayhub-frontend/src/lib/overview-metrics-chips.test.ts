import { describe, expect, it } from 'vitest'
import { overviewMetricsChips } from '@/lib/overview-metrics-chips'

describe('overviewMetricsChips', () => {
  it('shows Present, Guests, and First timers without Absent', () => {
    expect(
      overviewMetricsChips({
        present: 18,
        guests: 6,
        firstTimers: 0,
        pending: 0,
      }).map((chip) => chip.id),
    ).toEqual(['present', 'guests', 'firstTimers'])
  })

  it('adds Pending only when it is above zero', () => {
    expect(
      overviewMetricsChips({
        present: 18,
        guests: 6,
        firstTimers: 3,
        pending: 1,
      }).map((chip) => chip.id),
    ).toEqual(['present', 'guests', 'firstTimers', 'pending'])
  })
})
