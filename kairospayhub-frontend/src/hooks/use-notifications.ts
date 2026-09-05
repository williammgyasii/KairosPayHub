import { useCallback } from 'react'
import { NOTIFICATIONS_LIST_LIMIT } from '@/lib/notification-realtime'
import {
  useListNotificationsQuery,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
} from '@/store/notificationsApi'
import { formatRtkQueryError } from '@/store/baseQuery'

type UseNotificationsOptions = {
  enabled?: boolean
  limit?: number
}

export function useNotifications({
  enabled = true,
  limit = NOTIFICATIONS_LIST_LIMIT,
}: UseNotificationsOptions = {}) {
  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useListNotificationsQuery(
    { limit },
    {
      skip: !enabled,
      refetchOnFocus: true,
      refetchOnReconnect: true,
    },
  )
  const [markReadMutation] = useMarkNotificationReadMutation()
  const [markAllReadMutation] = useMarkAllNotificationsReadMutation()

  const refresh = useCallback(async () => {
    if (!enabled) return
    await refetch()
  }, [enabled, refetch])

  const markRead = useCallback(
    async (notificationId: string) => {
      return markReadMutation(notificationId).unwrap()
    },
    [markReadMutation],
  )

  const markAllRead = useCallback(async () => {
    await markAllReadMutation().unwrap()
  }, [markAllReadMutation])

  return {
    notifications: data?.notifications ?? [],
    unreadCount: data?.unreadCount ?? 0,
    loading: isLoading || isFetching,
    error: error ? formatRtkQueryError(error) : null,
    refresh,
    markRead,
    markAllRead,
  }
}
