import { useEffect, useRef } from 'react'
import * as signalR from '@microsoft/signalr'
import type { Notification } from '@/api/notifications'
import { getToken } from '@/auth/client'
import { apiBaseUrl } from '@/lib/api-base'
import {
  NOTIFICATIONS_LIST_LIMIT,
  normalizeNotification,
} from '@/lib/notification-realtime'
import { useAppDispatch } from '@/store/hooks'
import { invalidateAttendanceApprovalQueue } from '@/store/attendanceApi'
import { notificationsApi } from '@/store/notificationsApi'

const LOG_PREFIX = '[KairosPayHub notifications]'
const POLL_INTERVAL_MS = 20_000

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

function applyNotificationToCache(
  dispatch: ReturnType<typeof useAppDispatch>,
  limit: number,
  notification: Notification,
) {
  const args = { limit }
  const patch = dispatch(
    notificationsApi.util.updateQueryData('listNotifications', args, (draft) => {
      if (draft.notifications.some((n) => n.id === notification.id)) return
      draft.notifications.unshift(notification)
      draft.notifications = draft.notifications.slice(0, limit)
      if (!notification.readAt) draft.unreadCount += 1
    }),
  )

  if (patch.patches.length === 0) {
    dispatch(
      notificationsApi.util.upsertQueryData('listNotifications', args, {
        notifications: [notification],
        unreadCount: notification.readAt ? 0 : 1,
      }),
    )
  }
}

export function useNotificationsRealtime({
  enabled = true,
  limit = NOTIFICATIONS_LIST_LIMIT,
}: {
  enabled?: boolean
  limit?: number
} = {}) {
  const dispatch = useAppDispatch()
  const connectionRef = useRef<signalR.HubConnection | null>(null)

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
          transport:
            signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling,
          withCredentials: false,
        })
        .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
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
        dispatch(notificationsApi.util.invalidateTags(['Notifications']))
      })

      connection.onclose((err) => {
        console.warn(`${LOG_PREFIX} disconnected`, err?.message ?? 'connection closed')
      })

      connection.on('NotificationReceived', (raw: unknown) => {
        const notification = normalizeNotification(raw)
        if (!notification) {
          dispatch(notificationsApi.util.invalidateTags(['Notifications']))
          return
        }

        applyNotificationToCache(dispatch, limit, notification)

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

  useEffect(() => {
    if (!enabled) return

    const poll = () => {
      if (document.visibilityState !== 'visible') return
      dispatch(notificationsApi.util.invalidateTags(['Notifications']))
    }

    const intervalId = window.setInterval(poll, POLL_INTERVAL_MS)
    const onFocus = () => poll()
    window.addEventListener('focus', onFocus)

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('focus', onFocus)
    }
  }, [dispatch, enabled])
}
