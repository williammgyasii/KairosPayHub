import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import {
  campaignDatesForPreset,
  defaultCampaignEndDate,
  validateCampaignDates,
  validateCampaignEndsOn,
  validateCampaignGoLiveDate,
  validateCampaignStartsOn,
  validateSubCampaignEventDate,
  validateSubCampaignOneOffDates,
  validateSubCampaignRecurringDates,
} from '@/lib/campaign-date-validation'

describe('campaign date validation', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 8, 5))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('validateCampaignStartsOn', () => {
    it('requires a value', () => {
      expect(validateCampaignStartsOn('').error).toMatch(/required/i)
    })

    it('rejects invalid dates', () => {
      expect(validateCampaignStartsOn('not-a-date').error).toMatch(/valid date/i)
    })

    it('rejects past dates', () => {
      expect(validateCampaignStartsOn('2026-09-04').error).toMatch(/past/i)
    })

    it('accepts today and future dates', () => {
      expect(validateCampaignStartsOn('2026-09-05').error).toBeNull()
      expect(validateCampaignStartsOn('2026-12-01').error).toBeNull()
    })
  })

  describe('validateCampaignEndsOn', () => {
    it('rejects end before start', () => {
      expect(validateCampaignEndsOn('2026-09-10', '2026-09-15').error).toMatch(/on or after/i)
    })

    it('rejects past end dates', () => {
      expect(validateCampaignEndsOn('2026-09-04', '2026-09-04').error).toMatch(/past/i)
    })

    it('accepts end on or after start', () => {
      expect(validateCampaignEndsOn('2026-10-01', '2026-09-15').error).toBeNull()
      expect(validateCampaignEndsOn('2026-09-15', '2026-09-15').error).toBeNull()
    })
  })

  describe('validateCampaignGoLiveDate', () => {
    it('skips validation when mode is today', () => {
      expect(validateCampaignGoLiveDate('', 'today', '2026-12-31').error).toBeNull()
    })

    it('requires a date when mode is later', () => {
      expect(validateCampaignGoLiveDate('', 'later', '2026-12-31').error).toMatch(/required/i)
    })

    it('rejects go-live after campaign end', () => {
      expect(validateCampaignGoLiveDate('2027-01-01', 'later', '2026-12-31').error).toMatch(
        /after the campaign end/i,
      )
    })

    it('accepts go-live on or before end and not in past', () => {
      expect(validateCampaignGoLiveDate('2026-09-10', 'later', '2026-12-31').error).toBeNull()
    })
  })

  describe('validateCampaignDates', () => {
    it('aggregates all campaign date errors', () => {
      const result = validateCampaignDates({
        startsOn: '2026-09-04',
        endsOn: '2026-09-03',
        goLiveMode: 'later',
        goLiveDate: '2027-01-15',
      })
      expect(result.isValid).toBe(false)
      expect(result.startsOn.error).toBeTruthy()
      expect(result.endsOn.error).toBeTruthy()
      expect(result.goLiveDate.error).toBeTruthy()
    })

    it('passes a valid campaign timeline', () => {
      const result = validateCampaignDates({
        startsOn: '2026-09-10',
        endsOn: '2026-12-31',
        goLiveMode: 'later',
        goLiveDate: '2026-09-08',
      })
      expect(result.isValid).toBe(true)
    })
  })

  describe('sub-campaign date validation', () => {
    const parent = { parentStartsOn: '2026-10-01', parentEndsOn: '2026-12-31' }

    it('rejects event dates outside parent timeline', () => {
      expect(
        validateSubCampaignEventDate('2026-09-15', parent.parentStartsOn, parent.parentEndsOn).error,
      ).toMatch(/within the parent campaign/i)
      expect(
        validateSubCampaignEventDate('2027-01-01', parent.parentStartsOn, parent.parentEndsOn).error,
      ).toMatch(/within the parent campaign/i)
    })

    it('accepts event dates inside parent timeline', () => {
      expect(
        validateSubCampaignEventDate('2026-11-01', parent.parentStartsOn, parent.parentEndsOn).error,
      ).toBeNull()
    })

    it('validates recurring ranges', () => {
      expect(
        validateSubCampaignRecurringDates({
          rangeStart: '2026-11-01',
          rangeEnd: '2026-10-01',
          ...parent,
        }).isValid,
      ).toBe(false)

      expect(
        validateSubCampaignRecurringDates({
          rangeStart: '2026-11-01',
          rangeEnd: '2026-11-30',
          ...parent,
        }).isValid,
      ).toBe(true)
    })

    it('validates one-off sub-campaign dates', () => {
      expect(
        validateSubCampaignOneOffDates({
          eventDate: '2026-11-01',
          ...parent,
        }).isValid,
      ).toBe(true)
    })
  })

  describe('defaultCampaignEndDate', () => {
    it('defaults to one month after start', () => {
      expect(defaultCampaignEndDate('2026-09-15')).toBe('2026-10-15')
    })
  })

  describe('campaignDatesForPreset', () => {
    it('maps end-of-year and month presets from today', () => {
      expect(campaignDatesForPreset('endOfYear')).toEqual({
        startsOn: '2026-09-05',
        endsOn: '2026-12-31',
      })
      expect(campaignDatesForPreset('next3Months')).toEqual({
        startsOn: '2026-09-05',
        endsOn: '2026-12-05',
      })
      expect(campaignDatesForPreset('next6Months')).toEqual({
        startsOn: '2026-09-05',
        endsOn: '2027-03-05',
      })
      expect(campaignDatesForPreset('custom')).toBeNull()
    })
  })
})
