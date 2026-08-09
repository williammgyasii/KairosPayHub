import type { ApiClient } from './client'

export type ChurchAdminAffiliationKind = 'InChurch' | 'External'

export type ChurchAdministrator = {
  id: string
  firstName: string
  lastName: string
  email: string
  affiliationKind: ChurchAdminAffiliationKind
  memberId: string | null
  memberName: string | null
  isActive: boolean
  createdAt: string
}

export type CreateChurchAdministratorInput = {
  firstName: string
  lastName: string
  email: string
  affiliationKind: ChurchAdminAffiliationKind
  memberId?: string | null
  password?: string
  sendInviteEmail?: boolean
}

export async function listAdministrators(api: ApiClient) {
  return api.get<ChurchAdministrator[]>('/api/settings/administrators')
}

export async function createAdministrator(api: ApiClient, input: CreateChurchAdministratorInput) {
  return api.post<ChurchAdministrator>('/api/settings/administrators', input)
}

export async function suggestAdminEmail(api: ApiClient, baseEmail: string) {
  return api.post<{ email: string }>('/api/settings/administrators/suggest-email', {
    baseEmail,
  })
}

export async function deactivateAdministrator(api: ApiClient, id: string) {
  return api.patch<{ ok: boolean }>(`/api/settings/administrators/${id}/deactivate`, {})
}
