import { describe, expect, it } from 'vitest'
import { ageFromDateOfBirth, formatMemberAge } from '@/lib/member-age'

describe('ageFromDateOfBirth', () => {
  it('returns whole years before birthday this year', () => {
    expect(ageFromDateOfBirth('1995-03-15', new Date(2026, 2, 14))).toBe(30)
  })

  it('includes birthday on the day', () => {
    expect(ageFromDateOfBirth('1995-03-15', new Date(2026, 2, 15))).toBe(31)
  })

  it('returns null for invalid input', () => {
    expect(ageFromDateOfBirth('')).toBeNull()
    expect(ageFromDateOfBirth('bad-date')).toBeNull()
  })
})

describe('formatMemberAge', () => {
  it('prefers DOB over stored age', () => {
    expect(formatMemberAge('1995-03-15', 99, new Date(2026, 2, 15))).toBe('31')
  })

  it('falls back to stored age when DOB missing', () => {
    expect(formatMemberAge(null, 42)).toBe('42')
  })
})
