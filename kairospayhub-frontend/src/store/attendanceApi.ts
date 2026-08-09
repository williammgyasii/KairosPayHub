import type {
  AttendanceApprovalQueueItem,
  AttendanceApproveResult,
  AttendanceMeetingType,
  AttendanceOccurrenceRollup,
  AttendanceOccurrenceRollupQuery,
  AttendanceOccurrenceSummary,
  AttendanceScopeRollCallReview,
} from '@/api/attendance'
import { baseApi } from '@/store/baseApi'

function rollupSearchParams(query: AttendanceOccurrenceRollupQuery) {
  const params = new URLSearchParams()
  if (query.page) params.set('page', String(query.page))
  if (query.pageSize) params.set('pageSize', String(query.pageSize))
  if (query.sortBy) params.set('sortBy', query.sortBy)
  if (query.sortDir) params.set('sortDir', query.sortDir)
  if (query.search) params.set('search', query.search)
  if (query.personKind) params.set('personKind', query.personKind)
  if (query.cell) params.set('cell', query.cell)
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

export const attendanceApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listMeetingTypes: builder.query<AttendanceMeetingType[], void>({
      query: () => '/api/attendance/meeting-types',
      providesTags: ['AttendanceMeetingTypes'],
    }),
    listOccurrences: builder.query<AttendanceOccurrenceSummary[], string>({
      query: (meetingTypeId) => `/api/attendance/meeting-types/${meetingTypeId}/occurrences`,
      providesTags: (_result, _error, meetingTypeId) => [
        { type: 'AttendanceOccurrences', id: meetingTypeId },
      ],
    }),
    getOccurrenceRollup: builder.query<
      AttendanceOccurrenceRollup,
      { occurrenceId: string; query: AttendanceOccurrenceRollupQuery }
    >({
      query: ({ occurrenceId, query }) =>
        `/api/attendance/occurrences/${occurrenceId}/rollup${rollupSearchParams(query)}`,
      providesTags: (_result, _error, { occurrenceId }) => [
        { type: 'AttendanceRollup', id: occurrenceId },
      ],
    }),
    listApprovalQueue: builder.query<AttendanceApprovalQueueItem[], void>({
      query: () => '/api/attendance/approval-queue',
      providesTags: ['AttendanceApprovalQueue'],
    }),
    getScopeRollCallReview: builder.query<
      AttendanceScopeRollCallReview,
      { occurrenceId: string; scopeNodeId: string }
    >({
      query: ({ occurrenceId, scopeNodeId }) =>
        `/api/attendance/occurrences/${occurrenceId}/scopes/${scopeNodeId}/review`,
      providesTags: (_result, _error, { occurrenceId, scopeNodeId }) => [
        { type: 'AttendanceRollCallReview', id: `${occurrenceId}:${scopeNodeId}` },
      ],
    }),
    approveOccurrenceScope: builder.mutation<
      AttendanceApproveResult,
      { occurrenceId: string; scopeNodeId: string }
    >({
      query: ({ occurrenceId, scopeNodeId }) => ({
        url: `/api/attendance/occurrences/${occurrenceId}/scopes/${scopeNodeId}/approve`,
        method: 'POST',
        body: {},
      }),
      invalidatesTags: ['AttendanceApprovalQueue', 'AttendanceRollup', 'AttendanceRollCallReview'],
    }),
  }),
})

export const {
  useListMeetingTypesQuery,
  useListOccurrencesQuery,
  useGetOccurrenceRollupQuery,
  useListApprovalQueueQuery,
  useGetScopeRollCallReviewQuery,
  useApproveOccurrenceScopeMutation,
} = attendanceApi
