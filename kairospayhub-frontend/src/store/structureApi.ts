import type { StructureTree } from '@/api/structure'
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
  }),
})

export const { useGetStructureTreeQuery, useLazyGetStructureTreeQuery } = structureApi

export function invalidateStructureTags() {
  return structureApi.util.invalidateTags(['Structure'])
}
