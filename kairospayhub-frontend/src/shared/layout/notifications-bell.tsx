import { forwardRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { Bell } from 'lucide-react'
import type { Notification } from '@/api/notifications'
import { useNotifications } from '@/hooks/use-notifications'
import { usePhoneListViewport } from '@/shared/lib/use-phone-list-viewport'
import { Button } from '@/shared/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover'
import { cn } from '@/shared/lib/utils'

function notificationKindBadge(kind: Notification['kind']): string | null {
  if (kind.startsWith('Calendar')) return 'Event'
  if (kind.startsWith('Attendance')) return 'Attendance'
  if (kind.startsWith('Contribution')) return 'Giving'
  if (kind.startsWith('SubGiving') || kind.startsWith('Giving')) return 'Giving'
  if (kind.startsWith('ServiceRecording')) return 'Recording'
  return null
}

function notificationLink(notification: Notification): string {
  if (notification.linkPath) {
    return notification.linkPath.startsWith('/')
      ? notification.linkPath
      : `/${notification.linkPath}`
  }
  if (notification.kind.startsWith('Calendar')) return '/events'
  return '/givings'
}

function NotificationsPanel({
  notifications,
  unreadCount,
  loading,
  error,
  markAllRead,
  onItemClick,
}: {
  notifications: Notification[]
  unreadCount: number
  loading: boolean
  error: string | null
  markAllRead: () => void
  onItemClick: (notification: Notification) => void
}) {
  return (
    <>
      <div className="flex items-center justify-between gap-2 border-b border-border/60 px-3 py-2.5">
        <p className="text-sm font-medium text-foreground">Notifications</p>
        {unreadCount > 0 ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 shrink-0 px-2 text-xs text-muted-foreground"
            onClick={markAllRead}
          >
            Mark all read
          </Button>
        ) : null}
      </div>

      <div className="max-h-[min(22rem,55dvh)] overflow-y-auto">
        {loading && notifications.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">Loading…</p>
        ) : error ? (
          <p className="px-3 py-6 text-center text-sm text-destructive">{error}</p>
        ) : notifications.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">No notifications yet</p>
        ) : (
          <ul className="divide-y divide-border/60">
            {notifications.map((notification) => (
              <li key={notification.id}>
                <Link
                  to={notificationLink(notification)}
                  onClick={() => onItemClick(notification)}
                  className={cn(
                    'block px-3 py-2.5 transition-colors hover:bg-muted/50',
                    !notification.readAt && 'bg-primary/5',
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      {notificationKindBadge(notification.kind) ? (
                        <span className="mb-1 inline-flex rounded-full border border-violet-200/80 bg-violet-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-900">
                          {notificationKindBadge(notification.kind)}
                        </span>
                      ) : null}
                      <p className="break-words text-sm font-medium leading-snug text-foreground">
                        {notification.title}
                      </p>
                    </div>
                    {!notification.readAt ? (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                    ) : null}
                  </div>
                  <p className="mt-0.5 line-clamp-2 break-words text-xs text-muted-foreground">
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
    </>
  )
}

const BellButton = forwardRef<
  HTMLButtonElement,
  { unreadCount: number; onClick?: () => void }
>(function BellButton({ unreadCount, onClick }, ref) {
  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      className="relative h-9 w-9 text-muted-foreground hover:text-foreground"
      aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
      onClick={onClick}
    >
      <Bell className="h-[18px] w-[18px]" />
      {unreadCount > 0 ? (
        <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      ) : null}
    </Button>
  )
})

function panelChrome(children: ReactNode, className?: string) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border border-border/60 bg-popover text-popover-foreground shadow-md',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function NotificationsBell() {
  const phone = usePhoneListViewport()
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

  const panel = (
    <NotificationsPanel
      notifications={notifications}
      unreadCount={unreadCount}
      loading={loading}
      error={error}
      markAllRead={() => void markAllRead()}
      onItemClick={(notification) => void handleClick(notification)}
    />
  )

  if (phone) {
    return (
      <>
        <BellButton unreadCount={unreadCount} onClick={() => void handleOpenChange(!open)} />
        {open ? (
          <>
            <button
              type="button"
              className="fixed inset-0 z-[99] bg-black/20"
              aria-label="Close notifications"
              onClick={() => setOpen(false)}
            />
            <div
              role="dialog"
              aria-label="Notifications"
              data-testid="notifications-panel"
              className="fixed left-1/2 top-[4.25rem] z-[100] w-[min(17rem,calc(100dvw-2rem))] max-w-[calc(100dvw-2rem)] -translate-x-1/2"
            >
              {panelChrome(panel)}
            </div>
          </>
        ) : null}
      </>
    )
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <BellButton unreadCount={unreadCount} />
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-80 p-0">
        {panel}
      </PopoverContent>
    </Popover>
  )
}
