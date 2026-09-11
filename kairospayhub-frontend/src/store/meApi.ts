import type { Me } from '@/api/auth'
import type { TablePreferenceMaps } from '@/lib/table-preferences'
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
    getTablePreferences: builder.query<{ preferences: TablePreferenceMaps }, void>({
      query: () => '/api/me/table-preferences',
      providesTags: ['TablePreferences'],
    }),
    putTablePreference: builder.mutation<
      { key: string; columns: Record<string, boolean> },
      { key: string; columns: Record<string, boolean> }
    >({
      query: ({ key, columns }) => ({
        url: `/api/me/table-preferences/${encodeURIComponent(key)}`,
        method: 'PUT',
        body: { columns },
      }),
      async onQueryStarted({ key, columns }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          meApi.util.updateQueryData('getTablePreferences', undefined, (draft) => {
            if (!draft.preferences) draft.preferences = {}
            draft.preferences[key] = columns
          }),
        )
        try {
          await queryFulfilled
        } catch {
          patch.undo()
        }
      },
    }),
  }),
})

export const {
  useGetMeQuery,
  useLazyGetMeQuery,
  usePatchMeMutation,
  useGetTablePreferencesQuery,
  usePutTablePreferenceMutation,
} = meApi

export function invalidateMeTags() {
  return meApi.util.invalidateTags(['Me'])
}
