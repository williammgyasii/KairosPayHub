import { baseApi } from '@/store/baseApi'
import type { ServiceRecordingCategory } from '@/features/media/api/index'

type ListResponse = { categories: ServiceRecordingCategory[] }

export const serviceRecordingCategoriesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listServiceRecordingCategories: builder.query<ServiceRecordingCategory[], void>({
      query: () => '/api/service-recording-categories',
      transformResponse: (response: ListResponse) => response.categories,
      providesTags: ['ServiceRecordingCategories'],
    }),
    createServiceRecordingCategory: builder.mutation<ServiceRecordingCategory, { name: string }>({
      query: (body) => ({
        url: '/api/service-recording-categories',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['ServiceRecordingCategories'],
    }),
  }),
})

export const {
  useListServiceRecordingCategoriesQuery,
  useCreateServiceRecordingCategoryMutation,
} = serviceRecordingCategoriesApi
