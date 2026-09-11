import type { ApiClient } from '@/shared/api/client'

export type AttendanceMeetingType = {
  id: string
  title: string
  recurrenceKind: string
  dayOfWeek: string
  scopeKind: string
  scopeNodeId: string | null
  submissionLayerId?: string | null
  submissionLayerName?: string | null
  opensDayOffset: number
  opensTimeUtc: string
  deadlineDayOffset: number
  deadlineTimeUtc: string
  autoGenerateWeeksAhead: number
  isAlwaysOpen: boolean
  isActive: boolean
  createdAt: string
}

export type CreateAttendanceMeetingTypeInput = {
  title: string
  recurrenceKind?: string
  dayOfWeek?: string
  scopeKind?: string
  scopeNodeId?: string | null
  submissionLayerId?: string | null
  opensDayOffset?: number
  opensTimeUtc?: string
  deadlineDayOffset?: number
  deadlineTimeUtc?: string
  autoGenerateWeeksAhead?: number
  isAlwaysOpen?: boolean
  openNowForDemo?: boolean
}

export type UpdateAttendanceMeetingTypeInput = {
  title: string
  opensDayOffset?: number
  opensTimeUtc?: string
  deadlineDayOffset?: number
  deadlineTimeUtc?: string
  submissionLayerId?: string | null
  isAlwaysOpen?: boolean
}

export function listMeetingTypes(api: ApiClient) {
  return api.get<AttendanceMeetingType[]>('/api/attendance/meeting-types')
}

export function createMeetingType(api: ApiClient, input: CreateAttendanceMeetingTypeInput) {
  return api.post<AttendanceMeetingType>('/api/attendance/meeting-types', input)
}

export function updateMeetingType(
  api: ApiClient,
  meetingTypeId: string,
  input: UpdateAttendanceMeetingTypeInput,
) {
  return api.patch<AttendanceMeetingType>(`/api/attendance/meeting-types/${meetingTypeId}`, input)
}

export function deleteMeetingType(api: ApiClient, meetingTypeId: string) {
  return api.delete<{ ok: boolean }>(`/api/attendance/meeting-types/${meetingTypeId}`)
}

export type AttendanceOccurrenceSummary = {
  id: string
  meetingDate: string
  status: string
  submissionOpensAt: string
  submissionDeadlineAt: string
  scopeSubmissionCount: number
}

export type AttendanceEntry = {
  id: string
  memberId: string
  memberName: string
  memberScopeNodeId: string
  status: string
}

export type AttendanceScopeSubmission = {
  id: string
  scopeNodeId: string
  scopeUnitName: string
  parentUnitName?: string | null
  parentLayerName?: string | null
  layerName?: string | null
  lockStatus: string
  approvalStatus: string
  submittedAt: string | null
  enteredByRole?: string | null
  pendingApproverRole?: string | null
  membersPresent?: number
  membersAbsent?: number
  guestsPresent?: number
  firstTimersPresent?: number
  totalPresent?: number
}

export type AttendanceOccurrenceDetail = {
  id: string
  meetingTypeId: string
  meetingTypeTitle: string
  meetingDate: string
  status: string
  submissionOpensAt: string
  submissionDeadlineAt: string
  scopeSubmissions: AttendanceScopeSubmission[]
  entries: AttendanceEntry[]
  firstTimers: AttendanceFirstTimer[]
  inviteeEntries: AttendanceInviteeEntry[]
}

export type AttendanceFirstTimer = {
  id: string
  scopeNodeId: string
  name: string
  phone: string | null
  notes: string | null
}

export type AttendanceCellInvitee = {
  id: string
  name: string
  phone: string | null
  notes: string | null
  residence: string | null
  occupationStatus: string | null
  schoolOrWorkplace: string | null
  isFirstTimer: boolean
  priorChurchAttendance: string | null
  isActive: boolean
  graduatedMemberId: string | null
  invitedByMemberId: string | null
  invitedByMemberName: string | null
}

export type AttendanceInviteeEntry = {
  id: string
  scopeNodeId: string
  inviteeId: string
  inviteeName: string
  inviteePhone: string | null
  inviteeResidence: string | null
  inviteePriorChurchAttendance: string | null
  status: string
  wasFirstTimer: boolean
  invitedByMemberId: string | null
  invitedByMemberName: string | null
}

export type AttendanceApproveResult = {
  ok: boolean
  isFinal: boolean
  approvalStatus: string
  pendingApproverRole?: string | null
}

export function listOccurrences(api: ApiClient, meetingTypeId: string) {
  return api.get<AttendanceOccurrenceSummary[]>(
    `/api/attendance/meeting-types/${meetingTypeId}/occurrences`,
  )
}

export function getOccurrence(api: ApiClient, occurrenceId: string) {
  return api.get<AttendanceOccurrenceDetail>(`/api/attendance/occurrences/${occurrenceId}`)
}

export type AttendanceScopeRollCallReview = {
  occurrenceId: string
  scopeNodeId: string
  meetingTypeTitle: string
  meetingDate: string
  approvalStatus: string
  entries: AttendanceEntry[]
  inviteeEntries: AttendanceInviteeEntry[]
  guestRiskLevel?: string
  guestRiskReasons?: string[]
}

export function getScopeRollCallReview(
  api: ApiClient,
  occurrenceId: string,
  scopeNodeId: string,
) {
  return api.get<AttendanceScopeRollCallReview>(
    `/api/attendance/occurrences/${occurrenceId}/scopes/${scopeNodeId}/review`,
  )
}

export type AttendancePresentPerson = {
  name: string
  personKind: string
  scopeNodeId: string
  cellName: string
  parentUnitName?: string | null
  phone: string | null
  wasFirstTimer: boolean
  invitedByMemberName: string | null
}

export type AttendanceOccurrenceRollupQuery = {
  page?: number
  pageSize?: number
  sortBy?: 'name' | 'cell' | 'parent' | 'phone' | 'type' | 'invitedBy'
  sortDir?: 'asc' | 'desc'
  search?: string
  personKind?: 'Member' | 'Invitee' | 'FirstTimer' | ''
  cell?: string
}

export type AttendanceOccurrenceRollup = {
  occurrenceId: string
  meetingTypeTitle: string
  meetingDate: string
  approvedCellCount: number
  pendingCellCount: number
  membersPresent: number
  membersAbsent: number
  guestsPresent: number
  firstTimersPresent: number
  totalPresent: number
  items: AttendancePresentPerson[]
  totalCount: number
  page: number
  pageSize: number
}

export function getOccurrenceRollup(
  api: ApiClient,
  occurrenceId: string,
  query: AttendanceOccurrenceRollupQuery = {},
) {
  const params = new URLSearchParams()
  if (query.page) params.set('page', String(query.page))
  if (query.pageSize) params.set('pageSize', String(query.pageSize))
  if (query.sortBy) params.set('sortBy', query.sortBy)
  if (query.sortDir) params.set('sortDir', query.sortDir)
  if (query.search) params.set('search', query.search)
  if (query.personKind) params.set('personKind', query.personKind)
  if (query.cell) params.set('cell', query.cell)
  const qs = params.toString()
  return api.get<AttendanceOccurrenceRollup>(
    `/api/attendance/occurrences/${occurrenceId}/rollup${qs ? `?${qs}` : ''}`,
  )
}

export function putOccurrenceEntries(
  api: ApiClient,
  occurrenceId: string,
  scopeNodeId: string,
  payload: {
    entries: Array<{ memberId: string; status: 'Present' | 'Absent' }>
    firstTimers?: Array<{ name: string; phone?: string | null; notes?: string | null }>
    inviteeEntries?: Array<{ inviteeId: string; status: 'Present' | 'Absent'; wasFirstTimer: boolean }>
    pastorOverride?: boolean
  },
) {
  return api.put<{ ok: boolean }>(
    `/api/attendance/occurrences/${occurrenceId}/scopes/${scopeNodeId}/entries`,
    payload,
  )
}

export function listCellInvitees(api: ApiClient, scopeNodeId: string) {
  return api.get<AttendanceCellInvitee[]>(`/api/attendance/scopes/${scopeNodeId}/invitees`)
}

export function createCellInvitee(
  api: ApiClient,
  scopeNodeId: string,
  input: {
    name: string
    phone: string
    notes?: string | null
    residence?: string | null
    occupationStatus?: string | null
    schoolOrWorkplace?: string | null
    isFirstTimer?: boolean
    priorChurchAttendance?: string | null
    invitedByMemberId: string
  },
) {
  return api.post<AttendanceCellInvitee>(`/api/attendance/scopes/${scopeNodeId}/invitees`, input)
}

export function graduateCellInvitee(api: ApiClient, inviteeId: string) {
  return api.post<{ id: string }>(`/api/attendance/invitees/${inviteeId}/graduate`, {})
}

export function submitOccurrenceScope(
  api: ApiClient,
  occurrenceId: string,
  scopeNodeId: string,
  options?: { pastorOverride?: boolean },
) {
  return api.post<{ ok: boolean }>(
    `/api/attendance/occurrences/${occurrenceId}/scopes/${scopeNodeId}/submit`,
    { pastorOverride: options?.pastorOverride ?? false },
  )
}

export type AttendanceApprovalQueueItem = {
  occurrenceId: string
  scopeNodeId: string
  cellName: string
  meetingTypeTitle: string
  meetingDate: string
  submittedAt: string | null
  submittedByName: string | null
  enteredByRole: string | null
  presentCount: number
  absentCount: number
  memberCount: number
  guestRiskLevel?: string
  guestRiskReasons?: string[]
}

export type AttendanceMySubmission = {
  occurrenceId: string
  scopeNodeId: string
  scopeUnitName: string
  meetingTypeTitle: string
  meetingDate: string
  approvalStatus: string
  submittedAt: string | null
}

export function listMyAttendanceSubmissions(api: ApiClient) {
  return api.get<AttendanceMySubmission[]>('/api/attendance/my-submissions')
}

export function listAttendanceApprovalQueue(api: ApiClient) {
  return api.get<AttendanceApprovalQueueItem[]>('/api/attendance/approval-queue')
}

export function approveOccurrenceScope(
  api: ApiClient,
  occurrenceId: string,
  scopeNodeId: string,
) {
  return api.post<{ ok: boolean }>(
    `/api/attendance/occurrences/${occurrenceId}/scopes/${scopeNodeId}/approve`,
    {},
  )
}

export function rejectOccurrenceScope(
  api: ApiClient,
  occurrenceId: string,
  scopeNodeId: string,
  reason?: string | null,
) {
  return api.post<{ ok: boolean }>(
    `/api/attendance/occurrences/${occurrenceId}/scopes/${scopeNodeId}/reject`,
    { reason: reason ?? null },
  )
}

export type MemberAttendanceHistoryItem = {
  entryId: string
  occurrenceId: string
  meetingDate: string
  meetingTypeId: string
  meetingTypeTitle: string
  status: string
  scopeNodeId: string
  scopeUnitName: string | null
}

export type MemberAttendanceHistorySummary = {
  presentCount: number
  absentCount: number
  recordedCount: number
}

export type MemberAttendanceMeetingTypeSummary = {
  meetingTypeId: string
  title: string
  presentCount: number
  absentCount: number
  recordedCount: number
}

export type MemberAttendanceHistoryResponse = {
  items: MemberAttendanceHistoryItem[]
  summary: MemberAttendanceHistorySummary
  meetingTypes: MemberAttendanceMeetingTypeSummary[]
  meetingTypeId: string | null
  totalCount: number
  page: number
  pageSize: number
}

export function getMemberAttendanceHistory(
  api: ApiClient,
  memberId: string,
  page = 1,
  pageSize = 25,
  meetingTypeId?: string | null,
) {
  const qs = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
  if (meetingTypeId) qs.set('meetingTypeId', meetingTypeId)
  return api.get<MemberAttendanceHistoryResponse>(
    `/api/attendance/members/${memberId}/history?${qs}`,
  )
}
