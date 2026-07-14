import { useMemo } from 'react'
import { createApiClient } from './client'
import { getToken } from '../auth/cognito'

export function useApi() {
  return useMemo(
    () =>
      createApiClient({
        baseUrl: import.meta.env.VITE_API_URL,
        getToken,
      }),
    [],
  )
}
