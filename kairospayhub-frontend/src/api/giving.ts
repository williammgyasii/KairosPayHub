import type { ApiClient } from './client'
import { getAccessToken } from '../auth/client'

export type GivingType = 'Rhapsody' | 'SundayService' | 'SpecialProgram' | 'FellowshipGiving'
export type ProgramScopeKind = 'ChurchWide' | 'Fellowship' | 'PFCC' | 'FellowshipGroup'
export type ProgramStatus = 'Open' | 'Closed'
export type ContributionStatus = 'PendingApproval' | 'Approved' | 'Rejected'

export type GivingProgram = {
  id: string
  parentProgramId: string | null
  givingType: GivingType | string
  title: string
  periodLabel: string
  scopeKind: ProgramScopeKind | string
  scopeNodeId: string | null
  status: ProgramStatus | string
  createdAt: string
  hasChildren: boolean
  acceptsContributions: boolean
}

export type Contribution = {
  id: string
  programId: string
  memberId: string
  memberName: string
  amount: number
  currency: string
  dateSent: string
  attachmentKey: string
  notes: string | null
  memberParentNodeId: string
  status: ContributionStatus | string
  approvedAt: string | null
  rejectedReason: string | null
  createdAt: string
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
}

export type CreateContributionInput = {
  memberId: string
  amount: number
  currency?: string
  dateSent: string
  attachmentKey: string
  notes?: string | null
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

export async function getProgram(api: ApiClient, programId: string) {
  return api.get<GivingProgram>(`/api/giving/programs/${programId}`)
}

export async function createProgram(api: ApiClient, input: CreateGivingProgramInput) {
  return api.post<GivingProgram>('/api/giving/programs', input)
}

export async function listProgramContributions(
  api: ApiClient,
  programId: string,
  status?: ContributionStatus,
) {
  const qs = status ? `?status=${status}` : ''
  const res = await api.get<{ contributions: Contribution[] }>(
    `/api/giving/programs/${programId}/contributions${qs}`,
  )
  return res.contributions
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
  const res = await api.get<{ contributions: Contribution[] }>('/api/giving/me/contributions')
  return res.contributions
}

export async function listMemberContributions(api: ApiClient, memberId: string) {
  const res = await api.get<{ contributions: Contribution[] }>(
    `/api/giving/members/${memberId}/contributions`,
  )
  return res.contributions
}

export async function uploadGivingAttachment(file: File) {
  const token = getAccessToken()
  const body = new FormData()
  body.append('file', file)

  const res = await fetch(
    `${import.meta.env.VITE_API_URL.replace(/\/+$/, '')}/api/giving/attachments`,
    {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body,
    },
  )

  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error ?? 'Upload failed')
  return data as { attachmentKey: string; url: string }
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
