import { Link } from 'react-router-dom'
import { LogOut, Menu, Settings } from 'lucide-react'
import { displayName, roleScopeBadgeLabel, type Me } from '@/api/me'
import { useApi } from '@/api/useApi'
import { useAuth } from '@/auth/AuthContext'
import { NotificationsBell } from '@/components/layout/notifications-bell'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useSidebar } from '@/components/layout/sidebar-context'
import { cn, initials } from '@/lib/utils'

interface DashboardTopbarProps {
  me: Me & { onboarded: true }
}

export function DashboardTopbar({ me }: DashboardTopbarProps) {
  const api = useApi()
  const { email, signOut } = useAuth()
  const { toggleMobile } = useSidebar()
  const name = displayName(me, email)
  const roleLabel = roleScopeBadgeLabel(me)

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-end gap-3 border-b border-border/50 bg-background/80 px-4 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 sm:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="mr-auto h-9 w-9 text-muted-foreground lg:hidden"
        onClick={toggleMobile}
        aria-label="Open menu"
      >
        <Menu className="h-[18px] w-[18px]" />
      </Button>

      <Badge
        variant="secondary"
        className="hidden max-w-[12rem] shrink-0 truncate sm:inline-flex"
        title={roleLabel}
      >
        {roleLabel}
      </Badge>

      <NotificationsBell api={api} />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className={cn(
              'h-9 shrink-0 gap-2 rounded-full px-1.5 text-muted-foreground hover:text-foreground',
              'md:rounded-lg md:px-2',
            )}
          >
            <Avatar className="h-7 w-7">
              <AvatarFallback className="text-[11px]">{initials(me.name, me.email)}</AvatarFallback>
            </Avatar>
            <span className="hidden max-w-[140px] truncate text-sm font-medium text-foreground md:inline">
              {name}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72 p-0">
          <div className="border-b border-border/60 bg-muted/20 px-4 py-3">
            <div className="flex items-start gap-3">
              <Avatar className="h-10 w-10 shrink-0">
                <AvatarFallback className="text-sm">{initials(me.name, me.email)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-foreground">{name}</p>
                {email ? (
                  <p className="truncate text-xs text-muted-foreground">{email}</p>
                ) : null}
                <Badge
                  variant="secondary"
                  className="mt-2 max-w-full truncate font-normal"
                  title={roleLabel}
                >
                  {roleLabel}
                </Badge>
              </div>
            </div>
            {me.churchName ? (
              <p className="mt-3 truncate text-xs text-muted-foreground">{me.churchName}</p>
            ) : null}
          </div>

          <div className="p-1">
            <DropdownMenuItem asChild className="gap-2 px-3 py-2">
              <Link to="/settings">
                <Settings className="h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
          </div>

          <DropdownMenuSeparator className="mx-0" />

          <div className="p-1 pb-1.5">
            <DropdownMenuItem
              onClick={signOut}
              className="gap-2 px-3 py-2 text-destructive focus:bg-destructive/10 focus:text-destructive"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
