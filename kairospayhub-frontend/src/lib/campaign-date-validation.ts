import {
  addMonths,
  format,
  isAfter,
  isBefore,
  isValid,
  parseISO,
  startOfDay,
} from 'date-fns'

export type FieldValidation = {
  error: string | null
}

export type CampaignDateValidation = {
  startsOn: FieldValidation
  endsOn: FieldValidation
  goLiveDate: FieldValidation
  isValid: boolean
}

export type SubCampaignOneOffValidation = {
  eventDate: FieldValidation
  isValid: boolean
}

export type SubCampaignRecurringValidation = {
  rangeStart: FieldValidation
  rangeEnd: FieldValidation
  isValid: boolean
}

export function parseCampaignDate(value: string | null | undefined): Date | null {
  if (!value?.trim()) return null
  const parsed = parseISO(value.trim())
  return isValid(parsed) ? startOfDay(parsed) : null
}

export function todayStart(): Date {
  return startOfDay(new Date())
}

export function formatCampaignDate(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

export function defaultCampaignEndDate(startValue: string): string {
  const start = parseCampaignDate(startValue)
  if (!start) return ''
  return formatCampaignDate(addMonths(start, 1))
}

export type CampaignDateRangePreset = 'endOfYear' | 'next3Months' | 'next6Months' | 'custom'

export const CAMPAIGN_DATE_PRESETS: ReadonlyArray<{
  id: CampaignDateRangePreset
  label: string
}> = [
  { id: 'endOfYear', label: 'Until end of year' },
  { id: 'next3Months', label: 'Next 3 months' },
  { id: 'next6Months', label: 'Next 6 months' },
  { id: 'custom', label: 'Custom dates' },
]

/** Resolves start/end for a preset. `custom` returns null (caller keeps current picks). */
export function campaignDatesForPreset(
  preset: CampaignDateRangePreset,
  referenceDate: Date = todayStart(),
): { startsOn: string; endsOn: string } | null {
  if (preset === 'custom') return null

  const start = startOfDay(referenceDate)
  const startsOn = formatCampaignDate(start)

  if (preset === 'next3Months') {
    return { startsOn, endsOn: formatCampaignDate(addMonths(start, 3)) }
  }
  if (preset === 'next6Months') {
    return { startsOn, endsOn: formatCampaignDate(addMonths(start, 6)) }
  }

  // endOfYear — Dec 31 of the current calendar year (or next year if already past)
  let year = start.getFullYear()
  let end = new Date(year, 11, 31)
  if (isBefore(end, start)) {
    year += 1
    end = new Date(year, 11, 31)
  }
  return { startsOn, endsOn: formatCampaignDate(startOfDay(end)) }
}

export function validateRequiredFutureDate(
  value: string,
  label: string,
  referenceDate: Date = todayStart(),
): FieldValidation {
  if (!value.trim()) {
    return { error: `${label} is required.` }
  }
  const parsed = parseCampaignDate(value)
  if (!parsed) {
    return { error: `${label} is not a valid date.` }
  }
  if (isBefore(parsed, referenceDate)) {
    return { error: `${label} cannot be in the past.` }
  }
  return { error: null }
}

export function validateCampaignStartsOn(value: string): FieldValidation {
  return validateRequiredFutureDate(value, 'Start date')
}

export function validateCampaignEndsOn(
  value: string,
  startsOn: string,
): FieldValidation {
  const required = validateRequiredFutureDate(value, 'End date')
  if (required.error) return required

  const start = parseCampaignDate(startsOn)
  const end = parseCampaignDate(value)
  if (start && end && isBefore(end, start)) {
    return { error: 'End date must be on or after the start date.' }
  }
  return { error: null }
}

export function validateCampaignGoLiveDate(
  value: string,
  mode: 'today' | 'later',
  endsOn: string,
): FieldValidation {
  if (mode === 'today') {
    return { error: null }
  }
  const required = validateRequiredFutureDate(value, 'Go-live date')
  if (required.error) return required

  const goLive = parseCampaignDate(value)
  const end = parseCampaignDate(endsOn)
  if (goLive && end && isAfter(goLive, end)) {
    return { error: 'Go-live date cannot be after the campaign end date.' }
  }
  return { error: null }
}

export function validateCampaignDates(input: {
  startsOn: string
  endsOn: string
  goLiveMode: 'today' | 'later'
  goLiveDate: string
}): CampaignDateValidation {
  const startsOn = validateCampaignStartsOn(input.startsOn)
  const endsOn = validateCampaignEndsOn(input.endsOn, input.startsOn)
  const goLiveDate = validateCampaignGoLiveDate(
    input.goLiveDate,
    input.goLiveMode,
    input.endsOn,
  )
  return {
    startsOn,
    endsOn,
    goLiveDate,
    isValid: !startsOn.error && !endsOn.error && !goLiveDate.error,
  }
}

export function validateSubCampaignEventDate(
  value: string,
  parentStartsOn?: string | null,
  parentEndsOn?: string | null,
): FieldValidation {
  const required = validateRequiredFutureDate(value, 'Event date')
  if (required.error) return required

  const event = parseCampaignDate(value)
  const parentStart = parseCampaignDate(parentStartsOn ?? '')
  const parentEnd = parseCampaignDate(parentEndsOn ?? '')

  if (event && parentStart && isBefore(event, parentStart)) {
    return { error: 'Event date must be within the parent campaign timeline.' }
  }
  if (event && parentEnd && isAfter(event, parentEnd)) {
    return { error: 'Event date must be within the parent campaign timeline.' }
  }
  return { error: null }
}

export function validateSubCampaignRangeStart(
  value: string,
  parentStartsOn?: string | null,
  parentEndsOn?: string | null,
): FieldValidation {
  const required = validateRequiredFutureDate(value, 'Range start')
  if (required.error) return required

  const start = parseCampaignDate(value)
  const parentStart = parseCampaignDate(parentStartsOn ?? '')
  const parentEnd = parseCampaignDate(parentEndsOn ?? '')

  if (start && parentStart && isBefore(start, parentStart)) {
    return { error: 'Range start must be within the parent campaign timeline.' }
  }
  if (start && parentEnd && isAfter(start, parentEnd)) {
    return { error: 'Range start must be within the parent campaign timeline.' }
  }
  return { error: null }
}

export function validateSubCampaignRangeEnd(
  value: string,
  rangeStart: string,
  parentStartsOn?: string | null,
  parentEndsOn?: string | null,
): FieldValidation {
  const required = validateRequiredFutureDate(value, 'Range end')
  if (required.error) return required

  const start = parseCampaignDate(rangeStart)
  const end = parseCampaignDate(value)
  if (start && end && isBefore(end, start)) {
    return { error: 'Range end must be on or after the range start.' }
  }

  const parentStart = parseCampaignDate(parentStartsOn ?? '')
  const parentEnd = parseCampaignDate(parentEndsOn ?? '')

  if (end && parentStart && isBefore(end, parentStart)) {
    return { error: 'Range end must be within the parent campaign timeline.' }
  }
  if (end && parentEnd && isAfter(end, parentEnd)) {
    return { error: 'Range end must be within the parent campaign timeline.' }
  }
  return { error: null }
}

export function validateSubCampaignOneOffDates(input: {
  eventDate: string
  parentStartsOn?: string | null
  parentEndsOn?: string | null
}): SubCampaignOneOffValidation {
  const eventDate = validateSubCampaignEventDate(
    input.eventDate,
    input.parentStartsOn,
    input.parentEndsOn,
  )
  return { eventDate, isValid: !eventDate.error }
}

export function validateSubCampaignRecurringDates(input: {
  rangeStart: string
  rangeEnd: string
  parentStartsOn?: string | null
  parentEndsOn?: string | null
}): SubCampaignRecurringValidation {
  const rangeStart = validateSubCampaignRangeStart(
    input.rangeStart,
    input.parentStartsOn,
    input.parentEndsOn,
  )
  const rangeEnd = validateSubCampaignRangeEnd(
    input.rangeEnd,
    input.rangeStart,
    input.parentStartsOn,
    input.parentEndsOn,
  )
  return {
    rangeStart,
    rangeEnd,
    isValid: !rangeStart.error && !rangeEnd.error,
  }
}
