import type { ApiClient } from './client'
import { getAccessToken } from '../auth/client'
import { apiBaseUrl } from '@/lib/api-base'

export type GivingType = 'Rhapsody' | 'SundayService' | 'SpecialProgram' | 'FellowshipGiving'
export type ProgramScopeKind = 'ChurchWide' | 'Fellowship' | 'PFCC' | 'FellowshipGroup'
export type ProgramStatus = 'Open' | 'Closed'
export type ProgramApprovalStatus = 'Approved' | 'PendingPastorApproval' | 'Rejected'
export type ContributionStatus = 'PendingApproval' | 'Approved' | 'Rejected'
export type RemittanceMedium = 'PastorBank' | 'ChurchMomo' | 'PastorMomo' | 'Other'

export type GivingProgram = {
  id: string
  parentProgramId: string | null
  givingType: GivingType | string
  title: string
  periodLabel: string
  scopeKind: ProgramScopeKind | string
  scopeNodeId: string | null
  status: ProgramStatus | string
  approvalStatus: ProgramApprovalStatus | string
  createdByRole: string | null
  createdByName: string | null
  createdByScopeUnitName: string | null
  createdAt: string
  totalApprovedAmount: number
  hasChildren: boolean
  acceptsContributions: boolean
  directContributionCount: number
  directContributionTotalAmount: number
}

export type Contribution = {
  id: string
  programId: string
  programTitle: string
  programPeriodLabel: string
  isSubGiving: boolean
  isLegacyParentContribution: boolean
  memberId: string
  memberName: string
  amount: number
  currency: string
  dateSent: string
  attachmentKey: string
  attachmentUrl: string | null
  notes: string | null
  memberParentNodeId: string
  status: ContributionStatus | string
  enteredByRole: string | null
  enteredByName: string | null
  enteredByScopeUnitName: string | null
  sentToPastor: boolean | null
  remittanceMedium: RemittanceMedium | string | null
  remittanceMediumOther: string | null
  batchId: string | null
  pendingApproverRole: string | null
  approvedAt: string | null
  approvedByName: string | null
  rejectedReason: string | null
  createdAt: string
}

export type ContributionListSummary = {
  pendingCount: number
  pendingTotalAmount: number
  awaitingMyApprovalCount: number
  approvedCount: number
  approvedTotalAmount: number
  rejectedCount: number
}

export type ContributionListResult = {
  contributions: Contribution[]
  totalCount: number
  page: number
  pageSize: number
  summary: ContributionListSummary
}

export type ContributionListQuery = {
  page?: number
  pageSize?: number
  sortBy?:
    | 'createdAt'
    | 'dateSent'
    | 'amount'
    | 'memberName'
    | 'status'
    | 'approvedAt'
    | 'programTitle'
  sortDir?: 'asc' | 'desc'
  status?: ContributionStatus
  search?: string
  awaitingMyApproval?: boolean
  programId?: string
  batchId?: string
}

function summarizeContributions(contributions: Contribution[]): ContributionListSummary {
  const pending = contributions.filter((c) => c.status === 'PendingApproval')
  const approved = contributions.filter((c) => c.status === 'Approved')
  const rejected = contributions.filter((c) => c.status === 'Rejected')
  return {
    pendingCount: pending.length,
    pendingTotalAmount: pending.reduce((sum, c) => sum + c.amount, 0),
    awaitingMyApprovalCount: 0,
    approvedCount: approved.length,
    approvedTotalAmount: approved.reduce((sum, c) => sum + c.amount, 0),
    rejectedCount: rejected.length,
  }
}

export function normalizeContributionListResult(
  data: Partial<ContributionListResult> | null | undefined,
): ContributionListResult {
  const contributions = (data?.contributions ?? []).map((row) => ({
    ...row,
    programTitle: row.programTitle ?? 'Giving',
    programPeriodLabel: row.programPeriodLabel ?? '',
    isSubGiving: row.isSubGiving ?? false,
    isLegacyParentContribution: row.isLegacyParentContribution ?? false,
  }))
  const summary = data?.summary ?? summarizeContributions(contributions)
  return {
    contributions,
    totalCount: data?.totalCount ?? contributions.length,
    page: data?.page ?? 1,
    pageSize: data?.pageSize ?? (contributions.length || 25),
    summary,
  }
}

export type GivingRollupRow = {
  nodeId: string
  nodeName: string
  layerType: string
  totalAmount: number
  contributionCount: number
}

export type GivingProgramRollup = {
  programId: string
  totalApprovedAmount: number
  totalApprovedCount: number
  includesDescendants: boolean
  rows: GivingRollupRow[]
}

export type GivingDashboardCampaign = {
  id: string
  givingType: GivingType | string
  title: string
  periodLabel: string
  totalApprovedAmount: number
  subPeriodCount: number
}

export type GivingDashboard = {
  openCampaignCount: number
  campaigns: GivingDashboardCampaign[]
  scopeUnitName?: string | null
  fellowshipCount?: number
  cellCount?: number
  memberCount?: number
  pendingApprovalCount?: number
  scopedApprovedTotal?: number
}

export type CreateGivingProgramInput = {
  givingType?: GivingType | string
  title: string
  periodLabel: string
  scopeKind: ProgramScopeKind | string
  scopeNodeId?: string | null
  scopeNodeIds?: string[]
  parentProgramId?: string | null
}

export type CreateSubPeriodInput = {
  title: string
  periodLabel: string
  scopeKind: ProgramScopeKind | string
  scopeNodeId?: string | null
  scopeNodeIds?: string[]
  parentProgramId: string
  moveParentContributions?: boolean
}

export type CreateContributionInput = {
  memberId: string
  amount: number
  currency?: string
  dateSent: string
  attachmentKey: string
  notes?: string | null
  sentToPastor?: boolean | null
  remittanceMedium?: RemittanceMedium | string | null
  remittanceMediumOther?: string | null
  batchId?: string | null
}

export async function listPrograms(api: ApiClient) {
  const res = await api.get<{ programs: GivingProgram[] }>('/api/giving/programs')
  return res.programs
}

export async function listChildPrograms(api: ApiClient, parentProgramId: string) {
  const res = await api.get<{ programs: GivingProgram[] }>(
    `/api/giving/programs/${parentProgramId}/children`,
  )
  return res.programs
}

export async function getGivingDashboard(api: ApiClient) {
  return api.get<GivingDashboard>('/api/giving/dashboard')
}

export async function createSubPeriod(api: ApiClient, input: CreateSubPeriodInput) {
  return api.post<GivingProgram>('/api/giving/programs', input)
}

export async function approveSubGiving(api: ApiClient, programId: string) {
  return api.post<GivingProgram>(`/api/giving/programs/${programId}/approve`, {})
}

export async function rejectSubGiving(api: ApiClient, programId: string, reason?: string) {
  return api.post<GivingProgram>(`/api/giving/programs/${programId}/reject`, {
    reason: reason ?? null,
  })
}

export async function getProgram(api: ApiClient, programId: string) {
  return api.get<GivingProgram>(`/api/giving/programs/${programId}`)
}

export async function createProgram(api: ApiClient, input: CreateGivingProgramInput) {
  return api.post<GivingProgram>('/api/giving/programs', input)
}

export async function closeProgram(api: ApiClient, programId: string) {
  return api.post<GivingProgram>(`/api/giving/programs/${programId}/close`, {})
}

export async function reopenProgram(api: ApiClient, programId: string) {
  return api.post<GivingProgram>(`/api/giving/programs/${programId}/reopen`, {})
}

export async function deleteProgram(api: ApiClient, programId: string) {
  await api.delete(`/api/giving/programs/${programId}`)
}

export async function listProgramContributions(
  api: ApiClient,
  programId: string,
  query: ContributionListQuery = {},
) {
  const params = new URLSearchParams()
  if (query.page) params.set('page', String(query.page))
  if (query.pageSize) params.set('pageSize', String(query.pageSize))
  if (query.sortBy) params.set('sortBy', query.sortBy)
  if (query.sortDir) params.set('sortDir', query.sortDir)
  if (query.status) params.set('status', query.status)
  if (query.search?.trim()) params.set('search', query.search.trim())
  if (query.awaitingMyApproval) params.set('awaitingMyApproval', 'true')
  if (query.batchId) params.set('batchId', query.batchId)

  const qs = params.toString()
  const data = await api.get<Partial<ContributionListResult>>(
    `/api/giving/programs/${programId}/contributions${qs ? `?${qs}` : ''}`,
  )
  return normalizeContributionListResult(data)
}

export async function listAllContributions(api: ApiClient, query: ContributionListQuery = {}) {
  const params = new URLSearchParams()
  if (query.page) params.set('page', String(query.page))
  if (query.pageSize) params.set('pageSize', String(query.pageSize))
  if (query.sortBy) params.set('sortBy', query.sortBy)
  if (query.sortDir) params.set('sortDir', query.sortDir)
  if (query.status) params.set('status', query.status)
  if (query.search?.trim()) params.set('search', query.search.trim())
  if (query.awaitingMyApproval) params.set('awaitingMyApproval', 'true')
  if (query.programId) params.set('programId', query.programId)
  if (query.batchId) params.set('batchId', query.batchId)

  const qs = params.toString()
  const data = await api.get<Partial<ContributionListResult>>(
    `/api/giving/contributions${qs ? `?${qs}` : ''}`,
  )
  return normalizeContributionListResult(data)
}

export type MemberGivingTotal = {
  rank: number
  memberId: string
  memberName: string
  memberParentNodeId: string
  approvedTotal: number
  approvedCount: number
  pendingCount: number
  pendingTotal: number
  lastDateSent: string | null
}

export type MemberGivingTotalsSummary = {
  approvedTotalAmount: number
  memberCount: number
  giversCount: number
  approvedPaymentCount: number
  pendingCount: number
  pendingTotalAmount: number
}

export type MemberGivingTotalsResult = {
  members: MemberGivingTotal[]
  totalCount: number
  page: number
  pageSize: number
  summary: MemberGivingTotalsSummary
}

export type MemberGivingTotalsQuery = {
  page?: number
  pageSize?: number
  sortBy?: 'approvedTotal' | 'memberName' | 'approvedCount' | 'pendingCount' | 'lastDateSent'
  sortDir?: 'asc' | 'desc'
  search?: string
  programId?: string
}

export async function listMemberGivingTotals(
  api: ApiClient,
  query: MemberGivingTotalsQuery = {},
) {
  const params = new URLSearchParams()
  if (query.page) params.set('page', String(query.page))
  if (query.pageSize) params.set('pageSize', String(query.pageSize))
  if (query.sortBy) params.set('sortBy', query.sortBy)
  if (query.sortDir) params.set('sortDir', query.sortDir)
  if (query.search?.trim()) params.set('search', query.search.trim())
  if (query.programId) params.set('programId', query.programId)

  const qs = params.toString()
  const data = await api.get<{
    members?: Array<Record<string, unknown>>
    totalCount?: number
    page?: number
    pageSize?: number
    summary?: Partial<MemberGivingTotalsSummary>
  }>(`/api/giving/member-totals${qs ? `?${qs}` : ''}`)

  const members = (data?.members ?? []).map((row) => ({
    rank: Number(row.rank ?? row.Rank ?? 0),
    memberId: String(row.memberId ?? row.MemberId ?? ''),
    memberName: String(row.memberName ?? row.MemberName ?? 'Member'),
    memberParentNodeId: String(row.memberParentNodeId ?? row.MemberParentNodeId ?? ''),
    approvedTotal: Number(row.approvedTotal ?? row.ApprovedTotal ?? 0),
    approvedCount: Number(row.approvedCount ?? row.ApprovedCount ?? 0),
    pendingCount: Number(row.pendingCount ?? row.PendingCount ?? 0),
    pendingTotal: Number(row.pendingTotal ?? row.PendingTotal ?? 0),
    lastDateSent: (row.lastDateSent ?? row.LastDateSent ?? null) as string | null,
  }))

  const summary = data?.summary
  return {
    members,
    totalCount: data?.totalCount ?? members.length,
    page: data?.page ?? 1,
    pageSize: data?.pageSize ?? (members.length || 25),
    summary: {
      approvedTotalAmount: Number(summary?.approvedTotalAmount ?? 0),
      memberCount: Number(summary?.memberCount ?? 0),
      giversCount: Number(summary?.giversCount ?? 0),
      approvedPaymentCount: Number(
        summary?.approvedPaymentCount ?? summary?.ApprovedPaymentCount ?? 0,
      ),
      pendingCount: Number(summary?.pendingCount ?? 0),
      pendingTotalAmount: Number(summary?.pendingTotalAmount ?? 0),
    },
  } satisfies MemberGivingTotalsResult
}

export async function createContribution(
  api: ApiClient,
  programId: string,
  input: CreateContributionInput,
) {
  return api.post<Contribution>(`/api/giving/programs/${programId}/contributions`, input)
}

export async function approveContribution(
  api: ApiClient,
  programId: string,
  contributionId: string,
) {
  return api.post<Contribution>(
    `/api/giving/programs/${programId}/contributions/${contributionId}/approve`,
    {},
  )
}

export async function rejectContribution(
  api: ApiClient,
  programId: string,
  contributionId: string,
  reason?: string,
) {
  return api.post<Contribution>(
    `/api/giving/programs/${programId}/contributions/${contributionId}/reject`,
    { reason: reason ?? null },
  )
}

export async function getProgramRollup(api: ApiClient, programId: string) {
  return api.get<GivingProgramRollup>(`/api/giving/programs/${programId}/rollup`)
}

export async function listMyContributions(api: ApiClient) {
  const res = await api.get<Partial<ContributionListResult>>('/api/giving/me/contributions')
  return normalizeContributionListResult(res).contributions
}

export async function listMemberContributions(api: ApiClient, memberId: string) {
  const res = await api.get<Partial<ContributionListResult>>(
    `/api/giving/members/${memberId}/contributions`,
  )
  return normalizeContributionListResult(res).contributions
}

export async function uploadGivingAttachment(file: File) {
  const token = getAccessToken()
  const body = new FormData()
  body.append('file', file)

  const res = await fetch(`${apiBaseUrl()}/api/giving/attachments`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body,
  })

  const data = (await res.json().catch(() => ({}))) as Record<string, string>
  if (!res.ok) {
    throw new Error(data.error ?? data.title ?? 'Upload failed')
  }

  const attachmentKey = data.attachmentKey ?? data.AttachmentKey
  const url = data.url ?? data.Url
  if (!attachmentKey) throw new Error('Upload succeeded but no attachment key was returned')

  return { attachmentKey, url: url ?? '' }
}

export function givingAttachmentContentUrl(attachmentKey: string) {
  return `${apiBaseUrl()}/api/giving/attachments/content?key=${encodeURIComponent(attachmentKey)}`
}

export async function fetchGivingAttachmentBlobUrl(attachmentKey: string): Promise<string | null> {
  const token = getAccessToken()
  const res = await fetch(givingAttachmentContentUrl(attachmentKey), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) return null
  const blob = await res.blob()
  return URL.createObjectURL(blob)
}

export function formatAmount(amount: number, currency = 'GHS') {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount)
}

export function formatContributionStatus(status: string) {
  switch (status) {
    case 'PendingApproval':
      return 'Pending approval'
    case 'Approved':
      return 'Approved'
    case 'Rejected':
      return 'Rejected'
    default:
      return status
  }
}

export function formatApprovalStatus(status: string) {
  switch (status) {
    case 'PendingPastorApproval':
      return 'Pending pastor approval'
    case 'Approved':
      return 'Approved'
    case 'Rejected':
      return 'Rejected'
    default:
      return status
  }
}
