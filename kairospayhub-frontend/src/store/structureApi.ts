import type { StructureMember, StructureTree } from '@/api/structure'
import { baseApi } from '@/store/baseApi'

export type StructureTreeQueryArg = {
  includeMembers?: boolean
}

export const structureApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getStructureTree: builder.query<StructureTree, StructureTreeQueryArg | void>({
      query: (arg) => {
        const includeMembers = arg?.includeMembers !== false
        return includeMembers ? '/api/structure' : '/api/structure?includeMembers=false'
      },
      providesTags: ['Structure'],
    }),
    getStructureMember: builder.query<StructureMember, string>({
      query: (memberId) => `/api/structure/members/${memberId}`,
      providesTags: (_result, _error, memberId) => [{ type: 'Structure', id: memberId }],
    }),
  }),
})

export const {
  useGetStructureTreeQuery,
  useLazyGetStructureTreeQuery,
  useGetStructureMemberQuery,
} = structureApi

export function invalidateStructureTags() {
  return structureApi.util.invalidateTags(['Structure'])
}
