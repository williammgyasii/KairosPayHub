import type { CalendarEvent, CalendarFeedResponse, CreateCalendarEventInput } from '@/api/events'
import { baseApi } from '@/store/baseApi'

export type CalendarFeedArg = {
  from: string
  to: string
}

export const calendarApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCalendarFeed: builder.query<CalendarFeedResponse, CalendarFeedArg>({
      query: ({ from, to }) => {
        const params = new URLSearchParams({ from, to })
        return `/api/calendar/feed?${params}`
      },
      providesTags: ['Calendar'],
    }),
    createCalendarEvent: builder.mutation<CalendarEvent, CreateCalendarEventInput>({
      query: (body) => ({
        url: '/api/calendar/events',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Calendar'],
    }),
    deleteCalendarEvent: builder.mutation<{ ok: boolean }, string>({
      query: (eventId) => ({
        url: `/api/calendar/events/${eventId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Calendar'],
    }),
  }),
})

export const {
  useGetCalendarFeedQuery,
  useLazyGetCalendarFeedQuery,
  useCreateCalendarEventMutation,
  useDeleteCalendarEventMutation,
} = calendarApi

export function invalidateCalendarTags() {
  return calendarApi.util.invalidateTags(['Calendar'])
}
