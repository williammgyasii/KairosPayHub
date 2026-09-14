import { baseApi } from '@/store/baseApi'
import type {
  CreateServiceRecordingInput,
  CreateServiceRecordingResult,
  ServiceRecordingDetail,
  ServiceRecordingListPage,
  ServiceRecordingListQuery,
  ServiceRecordingPlayback,
  UpdateServiceRecordingInput,
} from '@/features/media/api/index'

const DEFAULT_PAGE_SIZE = 24

function buildListQuery({
  q,
  categoryId,
  seriesId,
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
}: ServiceRecordingListQuery) {
  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('pageSize', String(pageSize))
  if (q?.trim()) params.set('q', q.trim())
  if (categoryId) params.set('categoryId', categoryId)
  if (seriesId) params.set('seriesId', seriesId)
  return `/api/service-recordings?${params.toString()}`
}

export const serviceRecordingsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listServiceRecordings: builder.query<ServiceRecordingListPage, ServiceRecordingListQuery>({
      query: (args) => buildListQuery(args),
      serializeQueryArgs: ({ queryArgs }) => {
        const { page: _page, ...filters } = queryArgs
        return filters
      },
      merge: (currentCache, newItems, { arg }) => {
        if (!arg.page || arg.page <= 1) {
          return newItems
        }
        return {
          ...newItems,
          recordings: [...currentCache.recordings, ...newItems.recordings],
        }
      },
      forceRefetch: ({ currentArg, previousArg }) =>
        currentArg?.page !== previousArg?.page,
      providesTags: ['ServiceRecordings'],
    }),
    getServiceRecording: builder.query<ServiceRecordingDetail, string>({
      query: (recordingId) => `/api/service-recordings/${recordingId}`,
      providesTags: (_result, _error, recordingId) => [
        { type: 'ServiceRecording', id: recordingId },
      ],
    }),
    createServiceRecording: builder.mutation<
      CreateServiceRecordingResult,
      CreateServiceRecordingInput
    >({
      query: (body) => ({
        url: '/api/service-recordings',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['ServiceRecordings'],
    }),
    updateServiceRecording: builder.mutation<ServiceRecordingDetail, UpdateServiceRecordingInput>({
      query: ({ recordingId, ...body }) => ({
        url: `/api/service-recordings/${recordingId}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { recordingId }) => [
        'ServiceRecordings',
        { type: 'ServiceRecording', id: recordingId },
      ],
    }),
    publishServiceRecording: builder.mutation<ServiceRecordingDetail, string>({
      query: (recordingId) => ({
        url: `/api/service-recordings/${recordingId}/publish`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, recordingId) => [
        'ServiceRecordings',
        { type: 'ServiceRecording', id: recordingId },
      ],
    }),
    unpublishServiceRecording: builder.mutation<ServiceRecordingDetail, string>({
      query: (recordingId) => ({
        url: `/api/service-recordings/${recordingId}/unpublish`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, recordingId) => [
        'ServiceRecordings',
        { type: 'ServiceRecording', id: recordingId },
      ],
    }),
    deleteServiceRecording: builder.mutation<void, string>({
      query: (recordingId) => ({
        url: `/api/service-recordings/${recordingId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['ServiceRecordings'],
    }),
    getServiceRecordingPlayback: builder.query<ServiceRecordingPlayback, string>({
      query: (recordingId) => `/api/service-recordings/${recordingId}/playback`,
      keepUnusedDataFor: 60,
    }),
  }),
})

export const {
  useListServiceRecordingsQuery,
  useGetServiceRecordingQuery,
  useCreateServiceRecordingMutation,
  useUpdateServiceRecordingMutation,
  usePublishServiceRecordingMutation,
  useUnpublishServiceRecordingMutation,
  useDeleteServiceRecordingMutation,
  useGetServiceRecordingPlaybackQuery,
} = serviceRecordingsApi

export function invalidateServiceRecordingTags(recordingId?: string) {
  return serviceRecordingsApi.util.invalidateTags(
    recordingId
      ? ['ServiceRecordings', { type: 'ServiceRecording', id: recordingId }]
      : ['ServiceRecordings'],
  )
}
