import { useMemo } from 'react'
import { createApiClient } from './client'
import { getToken } from '../auth/client'
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
