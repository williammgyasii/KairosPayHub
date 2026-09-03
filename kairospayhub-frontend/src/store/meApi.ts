import type { Me } from '@/api/auth'
import { baseApi } from '@/store/baseApi'

export const meApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMe: builder.query<Me, void>({
      query: () => '/api/me',
      providesTags: ['Me'],
    }),
  }),
})

export const { useGetMeQuery, useLazyGetMeQuery } = meApi

export function invalidateMeTags() {
  return meApi.util.invalidateTags(['Me'])
}
