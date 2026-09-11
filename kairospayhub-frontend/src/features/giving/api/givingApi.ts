import type {
  Contribution,
  ContributionListQuery,
  ContributionListResult,
  CreateGivingProgramInput,
  GivingDashboard,
  GivingProgram,
  GivingProgramRollup,
} from '@/features/giving/api'
import { normalizeContributionListResult } from '@/features/giving/api'
import { baseApi } from '@/store/baseApi'

function contributionQueryString(query: ContributionListQuery) {
  const params = new URLSearchParams()
  if (query.page != null) params.set('page', String(query.page))
  if (query.pageSize != null) params.set('pageSize', String(query.pageSize))
  if (query.sortBy) params.set('sortBy', query.sortBy)
  if (query.sortDir) params.set('sortDir', query.sortDir)
  if (query.status) params.set('status', query.status)
  if (query.search) params.set('search', query.search)
  if (query.awaitingMyApproval != null) {
    params.set('awaitingMyApproval', String(query.awaitingMyApproval))
  }
  if (query.programId) params.set('programId', query.programId)
  if (query.batchId) params.set('batchId', query.batchId)
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

const givingInvalidations = [
  'GivingPrograms',
  'GivingDashboard',
  'GivingProgram',
  'Contributions',
  'ChildGivingPrograms',
  'GivingRollup',
] as const

export const givingApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listGivingPrograms: builder.query<GivingProgram[], void>({
      query: () => '/api/giving/programs',
      transformResponse: (response: { programs: GivingProgram[] }) => response.programs,
      providesTags: (result) =>
        result
          ? [
              ...result.map((program) => ({ type: 'GivingProgram' as const, id: program.id })),
              'GivingPrograms',
            ]
          : ['GivingPrograms'],
    }),
    getGivingDashboard: builder.query<GivingDashboard, void>({
      query: () => '/api/giving/dashboard',
      providesTags: ['GivingDashboard'],
    }),
    getGivingProgram: builder.query<GivingProgram, string>({
      query: (programId) => `/api/giving/programs/${programId}`,
      providesTags: (_result, _error, programId) => [{ type: 'GivingProgram', id: programId }],
    }),
    listChildGivingPrograms: builder.query<GivingProgram[], string>({
      query: (parentProgramId) => `/api/giving/programs/${parentProgramId}/children`,
      transformResponse: (response: { programs: GivingProgram[] }) => response.programs,
      providesTags: (_result, _error, parentProgramId) => [
        { type: 'ChildGivingPrograms', id: parentProgramId },
      ],
    }),
    getProgramRollup: builder.query<GivingProgramRollup, string>({
      query: (programId) => `/api/giving/programs/${programId}/rollup`,
      providesTags: (_result, _error, programId) => [{ type: 'GivingRollup', id: programId }],
    }),
    listProgramContributions: builder.query<
      ContributionListResult,
      { programId: string; query?: ContributionListQuery }
    >({
      query: ({ programId, query = {} }) =>
        `/api/giving/programs/${programId}/contributions${contributionQueryString(query)}`,
      transformResponse: (response: Partial<ContributionListResult>) =>
        normalizeContributionListResult(response),
      providesTags: (_result, _error, { programId }) => [
        { type: 'Contributions', id: programId },
      ],
    }),
    listContributions: builder.query<ContributionListResult, ContributionListQuery | undefined>({
      query: (query) => `/api/giving/contributions${contributionQueryString(query ?? {})}`,
      transformResponse: (response: Partial<ContributionListResult>) =>
        normalizeContributionListResult(response),
      providesTags: ['Contributions'],
    }),
    listMemberContributions: builder.query<
      ContributionListResult,
      { memberId: string; query?: ContributionListQuery }
    >({
      query: ({ memberId, query = {} }) =>
        `/api/giving/members/${memberId}/contributions${contributionQueryString(query)}`,
      transformResponse: (response: Partial<ContributionListResult>) =>
        normalizeContributionListResult(response),
      providesTags: (_result, _error, { memberId }) => [
        { type: 'Contributions', id: `member:${memberId}` },
      ],
    }),
    createGivingProgram: builder.mutation<GivingProgram, CreateGivingProgramInput>({
      query: (body) => ({
        url: '/api/giving/programs',
        method: 'POST',
        body,
      }),
      invalidatesTags: (result) => {
        const tags: Array<(typeof givingInvalidations)[number] | { type: 'GivingProgram'; id: string } | { type: 'ChildGivingPrograms'; id: string }> = [
          ...givingInvalidations,
        ]
        if (result?.parentProgramId) {
          tags.push(
            { type: 'GivingProgram', id: result.parentProgramId },
            { type: 'ChildGivingPrograms', id: result.parentProgramId },
          )
        }
        return tags
      },
    }),
    closeGivingProgram: builder.mutation<GivingProgram, string>({
      query: (programId) => ({
        url: `/api/giving/programs/${programId}/close`,
        method: 'POST',
        body: {},
      }),
      invalidatesTags: (_result, _error, programId) => [
        { type: 'GivingProgram', id: programId },
        'GivingPrograms',
        'GivingDashboard',
        'GivingRollup',
      ],
    }),
    reopenGivingProgram: builder.mutation<GivingProgram, string>({
      query: (programId) => ({
        url: `/api/giving/programs/${programId}/reopen`,
        method: 'POST',
        body: {},
      }),
      invalidatesTags: (_result, _error, programId) => [
        { type: 'GivingProgram', id: programId },
        'GivingPrograms',
        'GivingDashboard',
        'GivingRollup',
      ],
    }),
    deleteGivingProgram: builder.mutation<void, string>({
      query: (programId) => ({
        url: `/api/giving/programs/${programId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, programId) => [
        { type: 'GivingProgram', id: programId },
        'GivingPrograms',
        'GivingDashboard',
        'GivingRollup',
      ],
    }),
    approveGivingProgram: builder.mutation<GivingProgram, string>({
      query: (programId) => ({
        url: `/api/giving/programs/${programId}/approve`,
        method: 'POST',
        body: {},
      }),
      invalidatesTags: (_result, _error, programId) => [
        { type: 'GivingProgram', id: programId },
        'GivingPrograms',
        'GivingDashboard',
        'ChildGivingPrograms',
      ],
    }),
    rejectGivingProgram: builder.mutation<
      GivingProgram,
      { programId: string; reason?: string }
    >({
      query: ({ programId, reason }) => ({
        url: `/api/giving/programs/${programId}/reject`,
        method: 'POST',
        body: { reason: reason ?? null },
      }),
      invalidatesTags: (_result, _error, { programId }) => [
        { type: 'GivingProgram', id: programId },
        'GivingPrograms',
        'GivingDashboard',
        'ChildGivingPrograms',
      ],
    }),
    approveContribution: builder.mutation<
      Contribution,
      { programId: string; contributionId: string }
    >({
      query: ({ programId, contributionId }) => ({
        url: `/api/giving/programs/${programId}/contributions/${contributionId}/approve`,
        method: 'POST',
        body: {},
      }),
      invalidatesTags: (_result, _error, { programId }) => [
        { type: 'Contributions', id: programId },
        'Contributions',
        'GivingDashboard',
        'GivingRollup',
        { type: 'GivingProgram', id: programId },
      ],
    }),
    rejectContribution: builder.mutation<
      Contribution,
      { programId: string; contributionId: string; reason?: string }
    >({
      query: ({ programId, contributionId, reason }) => ({
        url: `/api/giving/programs/${programId}/contributions/${contributionId}/reject`,
        method: 'POST',
        body: { reason: reason ?? null },
      }),
      invalidatesTags: (_result, _error, { programId }) => [
        { type: 'Contributions', id: programId },
        'Contributions',
        'GivingDashboard',
        'GivingRollup',
        { type: 'GivingProgram', id: programId },
      ],
    }),
  }),
})

export const {
  useListGivingProgramsQuery,
  useGetGivingDashboardQuery,
  useLazyGetGivingDashboardQuery,
  useGetGivingProgramQuery,
  useListChildGivingProgramsQuery,
  useGetProgramRollupQuery,
  useListProgramContributionsQuery,
  useListContributionsQuery,
  useListMemberContributionsQuery,
  useCreateGivingProgramMutation,
  useCloseGivingProgramMutation,
  useReopenGivingProgramMutation,
  useDeleteGivingProgramMutation,
  useApproveGivingProgramMutation,
  useRejectGivingProgramMutation,
  useApproveContributionMutation,
  useRejectContributionMutation,
} = givingApi

export function invalidateGivingTags() {
  return givingApi.util.invalidateTags([...givingInvalidations])
}

export function invalidateGivingProgramDetail(programId: string) {
  return givingApi.util.invalidateTags([
    { type: 'GivingProgram', id: programId },
    { type: 'ChildGivingPrograms', id: programId },
    { type: 'Contributions', id: programId },
    { type: 'GivingRollup', id: programId },
    'GivingPrograms',
    'GivingDashboard',
  ])
}

export function invalidateChildGivingPrograms(parentProgramId: string) {
  return givingApi.util.invalidateTags([
    { type: 'ChildGivingPrograms', id: parentProgramId },
    { type: 'GivingProgram', id: parentProgramId },
  ])
}
