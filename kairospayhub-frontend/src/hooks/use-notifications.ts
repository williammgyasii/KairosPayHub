import { useCallback, useEffect, useRef } from 'react'
import * as signalR from '@microsoft/signalr'
import type { Notification } from '@/api/notifications'
import { getToken } from '@/auth/client'
import { apiBaseUrl } from '@/lib/api-base'
import { useAppDispatch } from '@/store/hooks'
import {
  notificationsApi,
  useListNotificationsQuery,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
} from '@/store/notificationsApi'
import { invalidateAttendanceApprovalQueue } from '@/store/attendanceApi'
import { formatRtkQueryError } from '@/store/baseQuery'

type UseNotificationsOptions = {
  enabled?: boolean
  limit?: number
}

const LOG_PREFIX = '[KairosPayHub notifications]'

function logTransport(connection: signalR.HubConnection): string {
  const transport = (
    connection as unknown as {
      connection?: { transport?: { constructor?: { name?: string } } }
    }
  ).connection?.transport?.constructor?.name

  if (transport === 'WebSocketTransport') return 'WebSockets'
  if (transport === 'LongPollingTransport') return 'LongPolling'
  if (transport === 'ServerSentEventsTransport') return 'ServerSentEvents'
  return transport ?? 'unknown'
}

export function useNotifications({ enabled = true, limit = 30 }: UseNotificationsOptions = {}) {
  const dispatch = useAppDispatch()
  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useListNotificationsQuery({ limit }, { skip: !enabled })
  const [markReadMutation] = useMarkNotificationReadMutation()
  const [markAllReadMutation] = useMarkAllNotificationsReadMutation()
  const connectionRef = useRef<signalR.HubConnection | null>(null)

  const refresh = useCallback(async () => {
    if (!enabled) return
    await refetch()
  }, [enabled, refetch])

  useEffect(() => {
    if (!enabled) return

    let cancelled = false

    async function connect() {
      const token = await getToken()
      if (!token || cancelled) return

      const hubUrl = `${apiBaseUrl()}/hubs/notifications`
      const connection = new signalR.HubConnectionBuilder()
        .withUrl(hubUrl, {
          accessTokenFactory: async () => (await getToken()) ?? '',
          withCredentials: false,
        })
        .withAutomaticReconnect()
        .configureLogging(
          import.meta.env.DEV ? signalR.LogLevel.Information : signalR.LogLevel.Warning,
        )
        .build()

      connection.onreconnecting((err) => {
        console.warn(`${LOG_PREFIX} reconnecting…`, err?.message ?? '')
      })

      connection.onreconnected((connectionId) => {
        console.info(`${LOG_PREFIX} reconnected`, {
          connectionId,
          transport: logTransport(connection),
        })
      })

      connection.onclose((err) => {
        console.warn(`${LOG_PREFIX} disconnected`, err?.message ?? 'connection closed')
      })

      connection.on('NotificationReceived', (notification: Notification) => {
        dispatch(
          notificationsApi.util.updateQueryData('listNotifications', { limit }, (draft) => {
            if (draft.notifications.some((n) => n.id === notification.id)) return
            draft.notifications.unshift(notification)
            draft.notifications = draft.notifications.slice(0, limit)
            if (!notification.readAt) draft.unreadCount += 1
          }),
        )

        if (
          notification.kind === 'AttendancePendingApproval'
          || notification.kind === 'AttendanceApproved'
          || notification.kind === 'AttendanceRejected'
        ) {
          dispatch(invalidateAttendanceApprovalQueue())
        }
      })

      connectionRef.current = connection

      try {
        console.info(`${LOG_PREFIX} connecting to ${hubUrl}`)
        await connection.start()
        console.info(`${LOG_PREFIX} connected successfully`, {
          connectionId: connection.connectionId,
          transport: logTransport(connection),
          state: connection.state,
        })
      } catch (err) {
        console.error(
          `${LOG_PREFIX} connection failed`,
          err instanceof Error ? err.message : err,
        )
      }
    }

    void connect()

    return () => {
      cancelled = true
      void connectionRef.current?.stop()
      connectionRef.current = null
    }
  }, [dispatch, enabled, limit])

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
