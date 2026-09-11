import { describe, expect, it } from 'vitest'
import { guestRiskQueueHint, guestRiskWarning } from '@/lib/guest-risk-warning'

describe('guestRiskWarning', () => {
  it('hides a clear sheet', () => {
    expect(guestRiskWarning('clear', [])).toBeNull()
    expect(guestRiskQueueHint('clear', [])).toBeNull()
  })

  it('shows watch and flagged reasons without blocking approve', () => {
    const watch = guestRiskWarning('watch', ['Guests far outnumber members present'])
    expect(watch?.tone).toBe('watch')
    expect(watch?.title).toBe('Guest numbers look unusual')
    expect(watch?.reasons).toEqual(['Guests far outnumber members present'])
    expect(guestRiskQueueHint('watch', ['Guests far outnumber members present'])).toBe(
      'Guests far outnumber members present',
    )

    const flagged = guestRiskWarning('flagged', ['Same phone used with different guest names'])
    expect(flagged?.tone).toBe('flagged')
    expect(flagged?.title).toBe('Guest list looks padded')
  })
})
