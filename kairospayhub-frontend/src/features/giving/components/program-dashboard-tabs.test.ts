import { describe, expect, it } from 'vitest'
import { normalizeProgramDetailTab } from '@/features/giving/components/program-dashboard'

describe('normalizeProgramDetailTab', () => {
  it('maps legacy awaiting/pending tabs to transactions', () => {
    expect(normalizeProgramDetailTab('awaiting')).toBe('transactions')
    expect(normalizeProgramDetailTab('pending')).toBe('transactions')
  })

  it('maps legacy approved tab to member-givings', () => {
    expect(normalizeProgramDetailTab('approved')).toBe('member-givings')
  })

  it('keeps new IA tabs', () => {
    expect(normalizeProgramDetailTab('member-givings')).toBe('member-givings')
    expect(normalizeProgramDetailTab('transactions')).toBe('transactions')
    expect(normalizeProgramDetailTab('dashboard')).toBe('dashboard')
  })

  it('ignores log and unknown values', () => {
    expect(normalizeProgramDetailTab('log')).toBeUndefined()
    expect(normalizeProgramDetailTab('nope')).toBeUndefined()
    expect(normalizeProgramDetailTab(null)).toBeUndefined()
  })
})
