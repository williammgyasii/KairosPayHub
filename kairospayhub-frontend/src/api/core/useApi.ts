/**
 * Legacy imperative API client for endpoints not yet migrated to RTK Query.
 * Prefer hooks from `@/store/*Api` (injected into `baseApi`) for reads and cache invalidation.
 */
import { useMemo } from 'react'
import { createApiClient } from './client'
import { getToken } from '@/auth/client'
import { apiBaseUrl } from '@/lib/api-base'

export function useApi() {
  return useMemo(
    () =>
      createApiClient({
        baseUrl: apiBaseUrl(),
        getToken,
      }),
    [],
  )
}
