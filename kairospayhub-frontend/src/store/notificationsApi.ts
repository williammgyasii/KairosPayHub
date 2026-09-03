import type {
  Notification,
  NotificationListResponse,
} from '@/api/notifications'
import { baseApi } from '@/store/baseApi'

export type ListNotificationsArg = {
  unreadOnly?: boolean
  limit?: number
}

export const notificationsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listNotifications: builder.query<NotificationListResponse, ListNotificationsArg | void>({
      query: (arg) => {
        const params = new URLSearchParams()
        if (arg?.unreadOnly) params.set('unreadOnly', 'true')
        if (arg?.limit) params.set('limit', String(arg.limit))
        const qs = params.toString()
        return `/api/notifications${qs ? `?${qs}` : ''}`
      },
      providesTags: ['Notifications'],
    }),
    markNotificationRead: builder.mutation<Notification, string>({
      query: (notificationId) => ({
        url: `/api/notifications/${notificationId}/read`,
        method: 'POST',
        body: {},
      }),
      invalidatesTags: ['Notifications'],
    }),
    markAllNotificationsRead: builder.mutation<{ markedRead: number }, void>({
      query: () => ({
        url: '/api/notifications/read-all',
        method: 'POST',
        body: {},
      }),
      invalidatesTags: ['Notifications'],
    }),
  }),
})

export const {
  useListNotificationsQuery,
  useLazyListNotificationsQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
} = notificationsApi

export function invalidateNotificationTags() {
  return notificationsApi.util.invalidateTags(['Notifications'])
}
