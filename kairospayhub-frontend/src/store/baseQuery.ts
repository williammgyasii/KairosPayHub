import { fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query'
import { getToken } from '@/auth/client'
import { apiBaseUrl } from '@/lib/api-base'

export type ApiQueryError = {
  status: number
  message: string
  data?: unknown
}

const rawBaseQuery = fetchBaseQuery({
  baseUrl: apiBaseUrl().replace(/\/+$/, ''),
  prepareHeaders: async (headers) => {
    const token = await getToken()
    if (token) headers.set('Authorization', `Bearer ${token}`)
    return headers
  },
})

export const baseQueryWithAuth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError | ApiQueryError
> = async (args, api, extraOptions) => {
  const result = await rawBaseQuery(args, api, extraOptions)

  if (result.error) {
    const status =
      typeof result.error.status === 'number'
        ? result.error.status
        : result.error.status === 'FETCH_ERROR'
          ? 0
          : 500

    return {
      error: {
        status,
        message:
          status > 0
            ? `Request failed with status ${status}`
            : 'Network request failed',
        data: result.error.data,
      } satisfies ApiQueryError,
    }
  }

  return result
}

export function formatRtkQueryError(error: unknown): string {
  if (!error || typeof error !== 'object') return 'Request failed'
  if ('message' in error && typeof error.message === 'string') return error.message
  if ('status' in error && typeof error.status === 'number') {
    return `Request failed with status ${error.status}`
  }
  return 'Request failed'
}
