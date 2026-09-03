import type { ApiClient } from '@/api/core/client'

export type EmailCheckScope = 'login' | 'roster' | 'both'

export type EmailAvailability = {
  available: boolean
  message: string | null
}

export async function checkEmailAvailability(
  api: ApiClient,
  email: string,
  scope: EmailCheckScope,
  excludeMemberId?: string,
) {
  const params = new URLSearchParams({
    email: email.trim(),
    scope,
  })
  if (excludeMemberId) params.set('excludeMemberId', excludeMemberId)

  return api.get<EmailAvailability>(`/api/structure/emails/check?${params.toString()}`)
}
