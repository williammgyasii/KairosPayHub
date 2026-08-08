import { useCallback, useEffect, useRef, useState } from 'react'
import * as signalR from '@microsoft/signalr'
import type { ApiClient } from '@/api/client'
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type Notification,
} from '@/api/notifications'
import { getToken } from '@/auth/client'
import { apiBaseUrl } from '@/lib/api-base'

type UseNotificationsOptions = {
  api: ApiClient
  enabled?: boolean
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

export function useNotifications({ api, enabled = true }: UseNotificationsOptions) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const connectionRef = useRef<signalR.HubConnection | null>(null)

  const refresh = useCallback(async () => {
    if (!enabled) return
    try {
      setError(null)
      const res = await listNotifications(api, { limit: 30 })
      setNotifications(res.notifications)
      setUnreadCount(res.unreadCount)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }, [api, enabled])

  useEffect(() => {
    if (!enabled) {
      setLoading(false)
      return
    }

    void refresh()
  }, [enabled, refresh])

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

      connection.onreconnecting((error) => {
        console.warn(`${LOG_PREFIX} reconnecting…`, error?.message ?? '')
      })

      connection.onreconnected((connectionId) => {
        console.info(`${LOG_PREFIX} reconnected`, {
          connectionId,
          transport: logTransport(connection),
        })
      })

      connection.onclose((error) => {
        console.warn(`${LOG_PREFIX} disconnected`, error?.message ?? 'connection closed')
      })

      connection.on('NotificationReceived', (notification: Notification) => {
        setNotifications((prev) => {
          if (prev.some((n) => n.id === notification.id)) return prev
          return [notification, ...prev].slice(0, 30)
        })
        if (!notification.readAt) {
          setUnreadCount((count) => count + 1)
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
  }, [enabled])

  const markRead = useCallback(
    async (notificationId: string) => {
      const updated = await markNotificationRead(api, notificationId)
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? updated : n)),
      )
      setUnreadCount((count) => Math.max(0, count - 1))
      return updated
    },
    [api],
  )

  const markAllRead = useCallback(async () => {
    await markAllNotificationsRead(api)
    setNotifications((prev) =>
      prev.map((n) => (n.readAt ? n : { ...n, readAt: new Date().toISOString() })),
    )
    setUnreadCount(0)
  }, [api])

  return {
    notifications,
    unreadCount,
    loading,
    error,
    refresh,
    markRead,
    markAllRead,
  }
}
