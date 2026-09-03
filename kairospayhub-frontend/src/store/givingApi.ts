import type {
  Contribution,
  ContributionListQuery,
  ContributionListResult,
  CreateGivingProgramInput,
  GivingDashboard,
  GivingProgram,
} from '@/api/giving'
import { normalizeContributionListResult } from '@/api/giving'
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
    createGivingProgram: builder.mutation<GivingProgram, CreateGivingProgramInput>({
      query: (body) => ({
        url: '/api/giving/programs',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['GivingPrograms', 'GivingDashboard'],
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
      ],
    }),
  }),
})

export const {
  useListGivingProgramsQuery,
  useGetGivingDashboardQuery,
  useLazyGetGivingDashboardQuery,
  useGetGivingProgramQuery,
  useListProgramContributionsQuery,
  useListContributionsQuery,
  useCreateGivingProgramMutation,
  useApproveGivingProgramMutation,
  useRejectGivingProgramMutation,
  useApproveContributionMutation,
  useRejectContributionMutation,
} = givingApi

export function invalidateGivingTags() {
  return givingApi.util.invalidateTags([
    'GivingPrograms',
    'GivingDashboard',
    'GivingProgram',
    'Contributions',
  ])
}
