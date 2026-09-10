import type { Me } from '@/api/auth'
import { baseApi } from '@/store/baseApi'

export type UpdateMeProfileRequest = {
  name: string
  phone?: string | null
  dateOfBirth?: string | null
  residence?: string | null
  state?: string | null
  occupationStatus?: string | null
  schoolOrWorkplace?: string | null
  workplace?: string | null
}

export const meApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMe: builder.query<Me, void>({
      query: () => '/api/me',
      providesTags: ['Me'],
    }),
    patchMe: builder.mutation<Me, UpdateMeProfileRequest>({
      query: (body) => ({
        url: '/api/me',
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['Me', 'Structure'],
    }),
  }),
})

export const { useGetMeQuery, useLazyGetMeQuery, usePatchMeMutation } = meApi

export function invalidateMeTags() {
  return meApi.util.invalidateTags(['Me'])
}
