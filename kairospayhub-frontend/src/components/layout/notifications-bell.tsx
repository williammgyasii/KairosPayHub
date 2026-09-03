import { useState } from 'react'
import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { Bell } from 'lucide-react'
import type { Notification } from '@/api/notifications'
import { useNotifications } from '@/hooks/use-notifications'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

type NotificationsBellProps = Record<string, never>

function notificationLink(notification: Notification): string {
  if (notification.linkPath) {
    return notification.linkPath.startsWith('/')
      ? notification.linkPath
      : `/${notification.linkPath}`
  }
  if (notification.kind.startsWith('Calendar')) return '/events'
  return '/givings'
}

export function NotificationsBell(_props: NotificationsBellProps) {
  const [open, setOpen] = useState(false)
  const { notifications, unreadCount, loading, error, refresh, markRead, markAllRead } =
    useNotifications()

  async function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next) await refresh()
  }

  async function handleClick(notification: Notification) {
    if (!notification.readAt) {
      try {
        await markRead(notification.id)
      } catch {
        // Navigation still works if mark-read fails.
      }
    }
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 text-muted-foreground hover:text-foreground"
          aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        >
          <Bell className="h-[18px] w-[18px]" />
          {unreadCount > 0 ? (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 sm:w-96">
        <div className="flex items-center justify-between border-b border-border/60 px-3 py-2.5">
          <p className="text-sm font-medium text-foreground">Notifications</p>
          {unreadCount > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground"
              onClick={() => void markAllRead()}
            >
              Mark all read
            </Button>
          ) : null}
        </div>

        <div className="max-h-[min(24rem,60vh)] overflow-y-auto">
          {loading && notifications.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">Loading…</p>
          ) : error ? (
            <p className="px-3 py-6 text-center text-sm text-destructive">{error}</p>
          ) : notifications.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              No notifications yet
            </p>
          ) : (
            <ul className="divide-y divide-border/60">
              {notifications.map((notification) => (
                <li key={notification.id}>
                  <Link
                    to={notificationLink(notification)}
                    onClick={() => void handleClick(notification)}
                    className={cn(
                      'block px-3 py-3 transition-colors hover:bg-muted/50',
                      !notification.readAt && 'bg-primary/5',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-foreground">{notification.title}</p>
                      {!notification.readAt ? (
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                      ) : null}
                    </div>
                    <p className="mt-0.5 line-clamp-3 text-xs text-muted-foreground">
                      {notification.body}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground/80">
                      {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
