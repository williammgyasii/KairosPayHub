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

export function formatTimeLocal(time: string, timeZoneLabel = 'local'): string {
  const [hourText, minuteText = '0'] = time.split(':')
  const hour = Number(hourText)
  const minute = Number(minuteText)
  const period = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour % 12 || 12
  return `${hour12}:${String(minute).padStart(2, '0')} ${period} ${timeZoneLabel}`
}

/** @deprecated Prefer formatTimeLocal with church timezone label. */
export function formatTimeGmt(time: string): string {
  return formatTimeLocal(time, 'GMT')
}

export function formatTimezoneLabel(timeZoneId: string | null | undefined): string {
  if (!timeZoneId) return 'local church time'
  if (timeZoneId === 'Africa/Accra') return 'Africa/Accra (GMT)'
  return timeZoneId
}

/** Label for approved submission-unit counts on metrics tiles. */
export function approvedUnitsTileLabel(layerDisplayName: string | null | undefined): string {
  const layer = layerDisplayName?.trim()
  if (!layer) return 'Approved units'
  const lower = layer.toLowerCase()
  if (lower.endsWith('s') || lower.endsWith('ies')) return `Approved ${layer}`
  if (lower.endsWith('y')) return `Approved ${layer.slice(0, -1)}ies`
  return `Approved ${layer}s`
}

export function formatSubmissionWindow(
  type: Pick<
    AttendanceMeetingType,
    'dayOfWeek' | 'opensDayOffset' | 'opensTimeUtc' | 'deadlineDayOffset' | 'deadlineTimeUtc'
  > & { isAlwaysOpen?: boolean },
  timeZoneId?: string | null,
): string {
  if (type.isAlwaysOpen) return 'Always open'
  const shortLabel = timeZoneId === 'Africa/Accra' || !timeZoneId ? 'GMT' : timeZoneId
  const openDay = dayLabelFromMeetingDay(type.dayOfWeek, type.opensDayOffset)
  const closeDay = dayLabelFromMeetingDay(type.dayOfWeek, type.deadlineDayOffset)
  return `Opens ${openDay} ${formatTimeLocal(type.opensTimeUtc, shortLabel)} · Closes ${closeDay} ${formatTimeLocal(type.deadlineTimeUtc, shortLabel)}`
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
  opensTimeUtc: '21:00:00',
  deadlineDayOffset: 1,
  deadlineTimeUtc: '12:00:00',
  autoGenerateWeeksAhead: 8,
  isAlwaysOpen: false,
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

/** Same-day / next-day options labeled from the meeting weekday. */
export function weeklyDayOffsetOptions(meetingDay: string) {
  const same = dayLabelFromMeetingDay(meetingDay, 0)
  const next = dayLabelFromMeetingDay(meetingDay, 1)
  return [
    { value: 0, label: `${same} (same day)` },
    { value: 1, label: `${next} (next day)` },
  ] as const
}

export const DAY_OFFSET_OPTIONS = [
  { value: 0, label: 'Same day as meeting' },
  { value: 1, label: 'Next day' },
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

export function todayDateKey(now = new Date(), timeZoneId?: string | null) {
  if (timeZoneId) {
    try {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: timeZoneId,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(now)
    } catch {
      // Invalid IANA id — fall through to browser local.
    }
  }

  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function isFutureServiceDate(
  meetingDate: string,
  now = new Date(),
  timeZoneId?: string | null,
) {
  return meetingDate > todayDateKey(now, timeZoneId)
}

/** Only services on or before today (church/local calendar) can be selected for roll call. */
export function selectableOccurrences(
  occurrences: AttendanceOccurrenceSummary[],
  now = new Date(),
  timeZoneId?: string | null,
) {
  return occurrences.filter((row) => !isFutureServiceDate(row.meetingDate, now, timeZoneId))
}

/** Prefer an open occurrence, otherwise the date closest to today. */
export function pickNearestOccurrence(
  occurrences: AttendanceOccurrenceSummary[],
  now = new Date(),
  timeZoneId?: string | null,
) {
  const eligible = selectableOccurrences(occurrences, now, timeZoneId)
  if (eligible.length === 0) return null

  const today = occurrenceDateValue(todayDateKey(now, timeZoneId))
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
  timeZoneId?: string | null,
) {
  return [...occurrences]
    .filter((row) => isFutureServiceDate(row.meetingDate, now, timeZoneId))
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
  timeZoneId?: string | null,
): { editable: boolean; reason: RollCallBlockReason | null; message: string | null } {
  if (isFutureServiceDate(detail.meetingDate, now, timeZoneId)) {
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
  timeZoneId?: string | null,
) {
  return rollCallState(detail, scopeNodeId, now, timeZoneId).editable
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

/** Compact metrics strip — Present, Members, First-timers, Pending only. */
export const METRICS_SUMMARY_TILE_IDS = [
  'present',
  'members',
  'firstTimers',
  'pending',
] as const

export type MetricsSummaryTileId = (typeof METRICS_SUMMARY_TILE_IDS)[number]

export type MetricsDetailTabId = 'who' | 'by-unit' | 'yet-to-submit'

export type WhoShowedUpColumnId =
  | 'name'
  | 'unit'
  | 'type'
  | 'phone'
  | 'invitedBy'
  | 'parentUnit'

export const WHO_SHOWED_UP_COLUMN_LABELS: Record<WhoShowedUpColumnId, string> = {
  name: 'Name',
  unit: 'Unit',
  type: 'Type',
  phone: 'Phone',
  invitedBy: 'Invited by',
  parentUnit: 'Parent unit',
}

export const DEFAULT_WHO_SHOWED_UP_COLUMN_VISIBILITY: Record<WhoShowedUpColumnId, boolean> = {
  name: true,
  unit: true,
  type: true,
  phone: true,
  invitedBy: true,
  parentUnit: false,
}

export type ByUnitColumnId =
  | 'unit'
  | 'present'
  | 'members'
  | 'firstTimers'
  | 'guests'
  | 'status'
  | 'submitted'

export const BY_UNIT_COLUMN_LABELS: Record<ByUnitColumnId, string> = {
  unit: 'Unit',
  present: 'Present',
  members: 'Members',
  firstTimers: 'First-timers',
  guests: 'Guests',
  status: 'Status',
  submitted: 'Submitted',
}

export const DEFAULT_BY_UNIT_COLUMN_VISIBILITY: Record<ByUnitColumnId, boolean> = {
  unit: true,
  present: true,
  members: true,
  firstTimers: true,
  guests: true,
  status: true,
  submitted: false,
}

export type UnitMetricsRow = {
  id: string
  scopeUnitName: string
  parentUnitName?: string | null
  parentLayerName?: string | null
  layerName?: string | null
  approvalStatus: string
  submittedAt: string | null
  membersPresent?: number
  guestsPresent?: number
  firstTimersPresent?: number
  totalPresent?: number
}

export type UnitMetricsGroup = {
  groupLabel: string
  parentLayerName: string | null
  present: number
  members: number
  firstTimers: number
  guests: number
  rows: UnitMetricsRow[]
}

/** Nest submission units under parent (e.g. fellowship) with aggregated counts. */
export function buildUnitMetricsGroups(rows: UnitMetricsRow[]): UnitMetricsGroup[] {
  const hasParents = rows.some((row) => Boolean(row.parentUnitName?.trim()))
  if (!hasParents) {
    return [
      {
        groupLabel: '',
        parentLayerName: null,
        present: rows.reduce((sum, row) => sum + (row.totalPresent ?? 0), 0),
        members: rows.reduce((sum, row) => sum + (row.membersPresent ?? 0), 0),
        firstTimers: rows.reduce((sum, row) => sum + (row.firstTimersPresent ?? 0), 0),
        guests: rows.reduce((sum, row) => sum + (row.guestsPresent ?? 0), 0),
        rows,
      },
    ]
  }

  const map = new Map<string, UnitMetricsGroup>()
  for (const row of rows) {
    const key = row.parentUnitName?.trim() || 'No parent unit'
    const existing = map.get(key)
    if (existing) {
      existing.rows.push(row)
      existing.present += row.totalPresent ?? 0
      existing.members += row.membersPresent ?? 0
      existing.firstTimers += row.firstTimersPresent ?? 0
      existing.guests += row.guestsPresent ?? 0
    } else {
      map.set(key, {
        groupLabel: key,
        parentLayerName: row.parentLayerName?.trim() || null,
        present: row.totalPresent ?? 0,
        members: row.membersPresent ?? 0,
        firstTimers: row.firstTimersPresent ?? 0,
        guests: row.guestsPresent ?? 0,
        rows: [row],
      })
    }
  }

  return [...map.values()].sort((a, b) => a.groupLabel.localeCompare(b.groupLabel))
}

export function yetToSubmitUnits<T extends { approvalStatus: string }>(rows: T[]): T[] {
  return rows.filter((row) => row.approvalStatus === 'Draft')
}

/** @deprecated Prefer buildUnitMetricsGroups */
export type ByUnitGroupMode = 'unit' | 'parent'

/** @deprecated Prefer buildUnitMetricsGroups */
export function groupScopeSubmissions(
  rows: Array<{
    id: string
    scopeUnitName: string
    parentUnitName?: string | null
    approvalStatus: string
    submittedAt: string | null
  }>,
  mode: ByUnitGroupMode,
): Array<{ groupLabel: string; rows: typeof rows }> {
  if (mode === 'unit') {
    return [{ groupLabel: '', rows }]
  }

  const map = new Map<string, typeof rows>()
  for (const row of rows) {
    const key = row.parentUnitName?.trim() || 'No parent unit'
    const list = map.get(key) ?? []
    list.push(row)
    map.set(key, list)
  }

  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([groupLabel, groupRows]) => ({ groupLabel, rows: groupRows }))
}
