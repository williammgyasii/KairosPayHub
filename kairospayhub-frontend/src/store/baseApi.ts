import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { getToken } from '@/auth/client'
import { apiBaseUrl } from '@/lib/api-base'

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: apiBaseUrl().replace(/\/+$/, ''),
    prepareHeaders: async (headers) => {
      const token = await getToken()
      if (token) headers.set('Authorization', `Bearer ${token}`)
      return headers
    },
  }),
  tagTypes: [
    'AttendanceMeetingTypes',
    'AttendanceOccurrences',
    'AttendanceRollup',
    'AttendanceApprovalQueue',
    'AttendanceRollCallReview',
  ],
  keepUnusedDataFor: 300,
  endpoints: () => ({}),
})
