import type {
  AttendanceMeetingType,
  AttendanceOccurrenceDetail,
  AttendanceOccurrenceSummary,
} from '@/api/attendance'

const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const

export function dayLabelFromMeetingDay(meetingDay: string, dayOffset: number): string {
  const idx = WEEKDAYS.findIndex((day) => day.toLowerCase() === meetingDay.toLowerCase())
  if (idx === -1) {
    return dayOffset === 0 ? 'Meeting day' : `${dayOffset} day(s) after meeting`
  }
  return WEEKDAYS[(idx + dayOffset) % WEEKDAYS.length]
}

export function formatTimeGmt(time: string): string {
  const [hourText, minuteText = '0'] = time.split(':')
  const hour = Number(hourText)
  const minute = Number(minuteText)
  const period = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour % 12 || 12
  return `${hour12}:${String(minute).padStart(2, '0')} ${period} GMT`
}

export function formatSubmissionWindow(
  type: Pick<
    AttendanceMeetingType,
    'dayOfWeek' | 'opensDayOffset' | 'opensTimeUtc' | 'deadlineDayOffset' | 'deadlineTimeUtc'
  >,
): string {
  const openDay = dayLabelFromMeetingDay(type.dayOfWeek, type.opensDayOffset)
  const closeDay = dayLabelFromMeetingDay(type.dayOfWeek, type.deadlineDayOffset)
  return `Opens ${openDay} ${formatTimeGmt(type.opensTimeUtc)} · Closes ${closeDay} ${formatTimeGmt(type.deadlineTimeUtc)}`
}

export function toTimeInputValue(time: string): string {
  return time.slice(0, 5)
}

export function toApiTimeValue(time: string): string {
  return time.length === 5 ? `${time}:00` : time
}

export const DEFAULT_MEETING_TYPE_WINDOW = {
  recurrenceKind: 'Weekly',
  dayOfWeek: 'Sunday',
  scopeKind: 'ChurchWide',
  opensDayOffset: 0,
  opensTimeUtc: '14:00:00',
  deadlineDayOffset: 1,
  deadlineTimeUtc: '00:00:00',
  autoGenerateWeeksAhead: 8,
} as const

/** Demo preset: today's service with submission window already open. */
export const OPEN_NOW_DEMO_WINDOW = {
  opensDayOffset: 0,
  opensTimeUtc: '00:00:00',
  deadlineDayOffset: 2,
  deadlineTimeUtc: '23:59:00',
} as const

export function todayDayOfWeek(): string {
  const days = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ] as const
  return days[new Date().getDay()]
}

export const DAY_OFFSET_OPTIONS = [
  { value: 0, label: 'Same day as meeting' },
  { value: 1, label: 'Next day' },
  { value: 2, label: '2 days after meeting' },
  { value: 3, label: '3 days after meeting' },
] as const

export const WEEKDAY_OPTIONS = [
  { value: 'Sunday', label: 'Every Sunday' },
  { value: 'Monday', label: 'Every Monday' },
  { value: 'Tuesday', label: 'Every Tuesday' },
  { value: 'Wednesday', label: 'Every Wednesday' },
  { value: 'Thursday', label: 'Every Thursday' },
  { value: 'Friday', label: 'Every Friday' },
  { value: 'Saturday', label: 'Every Saturday' },
] as const

export function formatMeetingSchedule(
  type: Pick<AttendanceMeetingType, 'recurrenceKind' | 'dayOfWeek'>,
): string {
  if (type.recurrenceKind === 'Weekly') {
    const match = WEEKDAY_OPTIONS.find((day) => day.value === type.dayOfWeek)
    return match?.label ?? `Every ${type.dayOfWeek}`
  }
  return type.recurrenceKind
}

function occurrenceDateValue(meetingDate: string) {
  return new Date(`${meetingDate}T00:00:00`).getTime()
}

export function todayDateKey(now = new Date()) {
  return now.toISOString().slice(0, 10)
}

export function isFutureServiceDate(meetingDate: string, now = new Date()) {
  return meetingDate > todayDateKey(now)
}

/** Only services on or before today can be selected for roll call. */
export function selectableOccurrences(
  occurrences: AttendanceOccurrenceSummary[],
  now = new Date(),
) {
  return occurrences.filter((row) => !isFutureServiceDate(row.meetingDate, now))
}

/** Prefer an open occurrence, otherwise the date closest to today. */
export function pickNearestOccurrence(
  occurrences: AttendanceOccurrenceSummary[],
  now = new Date(),
) {
  const eligible = selectableOccurrences(occurrences, now)
  if (eligible.length === 0) return null

  const today = occurrenceDateValue(todayDateKey(now))
  const open = eligible.filter((row) => row.status === 'Open')
  const pool = open.length > 0 ? open : eligible

  return [...pool].sort((a, b) => {
    const distA = Math.abs(occurrenceDateValue(a.meetingDate) - today)
    const distB = Math.abs(occurrenceDateValue(b.meetingDate) - today)
    if (distA !== distB) return distA - distB
    if (a.status === 'Open' && b.status !== 'Open') return -1
    if (b.status === 'Open' && a.status !== 'Open') return 1
    return occurrenceDateValue(b.meetingDate) - occurrenceDateValue(a.meetingDate)
  })[0]
}

export type RollCallBlockReason =
  | 'serviceNotHappened'
  | 'notYetOpen'
  | 'locked'
  | 'submitted'
  | 'noSubmission'

function scopeSubmission(detail: AttendanceOccurrenceDetail, scopeNodeId: string) {
  return detail.scopeSubmissions.find((row) => row.scopeNodeId === scopeNodeId) ?? null
}

function formatOpensAt(opensAt: string) {
  return new Date(opensAt).toLocaleString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  })
}

export function formatServiceDate(meetingDate: string) {
  const date = new Date(`${meetingDate}T00:00:00`)
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/** Earliest future service in the list (still locked for roll call). */
export function nextUpcomingOccurrence(
  occurrences: AttendanceOccurrenceSummary[],
  now = new Date(),
) {
  return [...occurrences]
    .filter((row) => isFutureServiceDate(row.meetingDate, now))
    .sort((a, b) => occurrenceDateValue(a.meetingDate) - occurrenceDateValue(b.meetingDate))[0] ?? null
}

export function upcomingRollCallLockMessage(
  occurrence: AttendanceOccurrenceSummary,
  now = new Date(),
) {
  const serviceLabel = formatServiceDate(occurrence.meetingDate)
  const opensAt = new Date(occurrence.submissionOpensAt)

  if (now < opensAt) {
    return {
      title: `${serviceLabel} — roll call locked`,
      description: `Roll call opens ${formatOpensAt(occurrence.submissionOpensAt)}.`,
    }
  }

  return {
    title: `${serviceLabel} — roll call locked`,
    description: 'This service has not happened yet. Roll call opens after the meeting.',
  }
}

export function rollCallPendingApproverLabel(role: string | null | undefined) {
  switch (role) {
    case 'PFCCManager':
      return 'PFCC'
    case 'FellowshipLeader':
      return 'fellowship leader'
    case 'Pastor':
      return 'pastor'
    default:
      return 'final approval'
  }
}

export function rollCallStatusLabel(
  status: string,
  viewerRole: string,
  pendingApproverRole?: string | null,
) {
  if (status === 'PendingApproval') {
    if (viewerRole === 'PFCCManager' || viewerRole === 'FellowshipLeader') {
      return 'Pending approval'
    }
    if (pendingApproverRole === 'FellowshipLeader') {
      return 'Awaiting fellowship approval'
    }
    return 'Awaiting approval'
  }
  if (status === 'Approved') return 'Approved'
  if (status === 'Rejected') return 'Rejected'
  if (status === 'Draft') return 'Draft'
  return status
}

export function rollCallPendingMessage() {
  return 'Roll call submitted — awaiting fellowship or PFCC approval.'
}

export function rollCallState(
  detail: AttendanceOccurrenceDetail,
  scopeNodeId: string,
  now = new Date(),
  options?: { pastorDemo?: boolean },
): { editable: boolean; reason: RollCallBlockReason | null; message: string | null } {
  if (options?.pastorDemo) {
    const submission = scopeSubmission(detail, scopeNodeId)
    if (!submission) {
      return {
        editable: false,
        reason: 'noSubmission',
        message: 'Roll call is not set up for this cell yet.',
      }
    }
    if (submission.approvalStatus === 'PendingApproval') {
      return {
        editable: false,
        reason: 'submitted',
        message: rollCallPendingMessage(),
      }
    }
    if (submission.approvalStatus === 'Approved') {
      return {
        editable: false,
        reason: 'submitted',
        message: 'Roll call has been approved.',
      }
    }
    return { editable: true, reason: null, message: null }
  }

  if (isFutureServiceDate(detail.meetingDate, now)) {
    return {
      editable: false,
      reason: 'serviceNotHappened',
      message: 'This service has not happened yet. Roll call opens after the meeting.',
    }
  }

  const submission = scopeSubmission(detail, scopeNodeId)
  if (!submission) {
    return {
      editable: false,
      reason: 'noSubmission',
      message: 'Roll call is not set up for this cell yet.',
    }
  }

  if (submission.approvalStatus === 'PendingApproval') {
    return {
      editable: false,
      reason: 'submitted',
      message: rollCallPendingMessage(),
    }
  }

  if (submission.approvalStatus === 'Approved') {
    return {
      editable: false,
      reason: 'submitted',
      message: 'Roll call has been approved.',
    }
  }

  if (now < new Date(detail.submissionOpensAt)) {
    return {
      editable: false,
      reason: 'notYetOpen',
      message: `Roll call opens ${formatOpensAt(detail.submissionOpensAt)}.`,
    }
  }

  if (now >= new Date(detail.submissionDeadlineAt) && submission.lockStatus !== 'Reopened') {
    return {
      editable: false,
      reason: 'locked',
      message: 'The submission window for this service has closed.',
    }
  }

  const effectiveLockStatus =
    submission.lockStatus === 'NotYetOpen'
    && now >= new Date(detail.submissionOpensAt)
    && now < new Date(detail.submissionDeadlineAt)
      ? 'Editable'
      : submission.lockStatus

  if (effectiveLockStatus === 'Editable' || effectiveLockStatus === 'Reopened') {
    return { editable: true, reason: null, message: null }
  }

  return {
    editable: false,
    reason: 'locked',
    message: 'Roll call is locked for this occurrence.',
  }
}

export function isRollCallEditable(
  detail: AttendanceOccurrenceDetail,
  scopeNodeId: string,
  now = new Date(),
  options?: { pastorDemo?: boolean },
) {
  return rollCallState(detail, scopeNodeId, now, options).editable
}

export function formatOccurrenceLabel(occurrence: AttendanceOccurrenceSummary) {
  const date = new Date(`${occurrence.meetingDate}T00:00:00`)
  const dateLabel = date.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  return `${dateLabel} · ${occurrence.status}`
}
