import { createApiClient } from '@/shared/api/client'
import { apiBaseUrl } from '@/shared/api/api-base'

export type JoinInvitePreview = {
  churchName: string
  unitName: string
  countryCode: string | null
  expiresAt: string
}

export type JoinInvite = {
  token: string
  expiresAt: string
}

export type SubmitJoinInviteBody = {
  name: string
  email?: string | null
  phone?: string | null
  dateOfBirth?: string | null
  residence?: string | null
  state?: string | null
  occupationStatus?: string | null
  schoolOrWorkplace?: string | null
  workplace?: string | null
}

const publicApi = createApiClient({
  baseUrl: apiBaseUrl(),
  getToken: async () => null,
})

export function joinInviteUrl(token: string): string {
  return `${window.location.origin}/join/${token}`
}

export const publicJoinApi = {
  preview: (token: string) => publicApi.get<JoinInvitePreview>(`/api/join/${token}`),
  submit: (token: string, body: SubmitJoinInviteBody) =>
    publicApi.post(`/api/join/${token}`, body),
}
