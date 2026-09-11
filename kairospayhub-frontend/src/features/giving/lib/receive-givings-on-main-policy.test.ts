import { describe, expect, it } from 'vitest'
import { receiveGivingsOnMainPolicy } from '@/features/giving/lib/receive-givings-on-main-policy'

describe('receiveGivingsOnMainPolicy', () => {
  it('uses product label and help for on vs off', () => {
    const on = receiveGivingsOnMainPolicy({
      receiveGivingsOnMain: true,
      isRoot: true,
      acceptsContributions: true,
      forCreate: true,
    })
    expect(on.label).toBe('Receive givings on main campaign?')
    expect(on.helpText.toLowerCase()).toContain('main campaign')
    expect(on.requiresFirstSubOnCreate).toBe(false)

    const off = receiveGivingsOnMainPolicy({
      receiveGivingsOnMain: false,
      isRoot: true,
      acceptsContributions: true,
      forCreate: true,
    })
    expect(off.requiresFirstSubOnCreate).toBe(true)
    expect(off.helpText.toLowerCase()).toContain('sub-campaign')
  })

  it('gates logging on root by receive flag and acceptsContributions', () => {
    expect(
      receiveGivingsOnMainPolicy({
        receiveGivingsOnMain: false,
        isRoot: true,
        acceptsContributions: true,
      }).canLogOnProgram,
    ).toBe(false)

    expect(
      receiveGivingsOnMainPolicy({
        receiveGivingsOnMain: true,
        isRoot: true,
        acceptsContributions: true,
      }).canLogOnProgram,
    ).toBe(true)

    expect(
      receiveGivingsOnMainPolicy({
        receiveGivingsOnMain: false,
        isRoot: false,
        acceptsContributions: true,
      }).canLogOnProgram,
    ).toBe(true)
  })
})
