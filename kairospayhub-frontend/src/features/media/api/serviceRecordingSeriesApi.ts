import { baseApi } from '@/store/baseApi'
import type { ServiceRecordingSeries } from '@/features/media/api/index'

type ListResponse = { series: ServiceRecordingSeries[] }

export const serviceRecordingSeriesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listServiceRecordingSeries: builder.query<ServiceRecordingSeries[], void>({
      query: () => '/api/service-recording-series',
      transformResponse: (response: ListResponse) => response.series,
      providesTags: ['ServiceRecordingSeries'],
    }),
    createServiceRecordingSeries: builder.mutation<
      ServiceRecordingSeries,
      { name: string; description?: string | null }
    >({
      query: (body) => ({
        url: '/api/service-recording-series',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['ServiceRecordingSeries'],
    }),
  }),
})

export const {
  useListServiceRecordingSeriesQuery,
  useCreateServiceRecordingSeriesMutation,
} = serviceRecordingSeriesApi
