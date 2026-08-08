import { Link } from 'react-router-dom'
import { LogOut, Menu, Settings } from 'lucide-react'
import { displayName, type Me } from '@/api/me'
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
  DropdownMenuLabel,
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

      <Badge variant="secondary" className="hidden shrink-0 sm:inline-flex">
        {me.role}
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
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col gap-0.5">
              <span className="font-medium text-foreground">{name}</span>
              <span className="text-xs text-muted-foreground">{email}</span>
              <span className="text-xs capitalize text-muted-foreground">{me.role.toLowerCase()}</span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link to="/settings">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
