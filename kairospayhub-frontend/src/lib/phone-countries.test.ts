import { describe, expect, it } from 'vitest'
import { capLocalPhoneDigits, formatPhoneE164, isLocalPhoneComplete, parsePhoneE164 } from './phone-countries'

describe('capLocalPhoneDigits', () => {
  it('caps Ghana numbers at 10 digits with leading 0 or 9 without', () => {
    expect(capLocalPhoneDigits('233', '024123456789')).toBe('0241234567')
    expect(capLocalPhoneDigits('233', '24123456789')).toBe('241234567')
  })

  it('caps Nigeria at 10 NSN digits', () => {
    expect(capLocalPhoneDigits('234', '080312345678')).toBe('08031234567')
  })

  it('caps US numbers at 10 digits', () => {
    expect(capLocalPhoneDigits('1', '202555010012')).toBe('2025550100')
  })
})

describe('isLocalPhoneComplete', () => {
  it('requires full Ghana NSN length', () => {
    expect(isLocalPhoneComplete('233', '024123456')).toBe(false)
    expect(isLocalPhoneComplete('233', '0241234567')).toBe(true)
  })
})

describe('formatPhoneE164', () => {
  it('strips Ghana trunk 0 for E.164', () => {
    expect(formatPhoneE164('233', '0241234567')).toBe('+233241234567')
    expect(formatPhoneE164('233', '241234567')).toBe('+233241234567')
  })
})

describe('parsePhoneE164', () => {
  it('parses stored Ghana numbers back to local input', () => {
    expect(parsePhoneE164('+233241234567')).toEqual({
      dialCode: '233',
      localNumber: '241234567',
    })
  })
})
