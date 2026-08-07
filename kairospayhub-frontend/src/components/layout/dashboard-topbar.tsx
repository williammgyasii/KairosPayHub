import { Link } from 'react-router-dom'
import { ChevronRight, LogOut, Menu, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { displayName, type Me } from '@/api/me'
import { useAuth } from '@/auth/AuthContext'
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
import { Separator } from '@/components/ui/separator'
import { useSidebar } from '@/components/layout/sidebar-context'
import { initials } from '@/lib/utils'

interface DashboardTopbarProps {
  me: Me & { onboarded: true }
  title: string
  description?: string
}

export function DashboardTopbar({ me, title, description }: DashboardTopbarProps) {
  const { email, signOut } = useAuth()
  const { collapsed, toggleCollapsed, toggleMobile } = useSidebar()
  const name = displayName(me, email)

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b bg-background/90 px-4 backdrop-blur sm:px-6">
      <Button
        variant="outline"
        size="icon"
        className="lg:hidden"
        onClick={toggleMobile}
        aria-label="Open menu"
      >
        <Menu className="h-4 w-4" />
      </Button>

      <Button
        variant="outline"
        size="icon"
        className="hidden lg:inline-flex"
        onClick={toggleCollapsed}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
      </Button>

      <Separator orientation="vertical" className="hidden h-6 sm:block" />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">
            Dashboard
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground">{title}</span>
        </div>
        <h1 className="truncate text-lg font-semibold tracking-tight">{title}</h1>
        {description && (
          <p className="hidden truncate text-sm text-muted-foreground sm:block">{description}</p>
        )}
      </div>

      <Badge variant="secondary" className="hidden sm:inline-flex">
        {me.role}
      </Badge>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-10 gap-2 px-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback>{initials(me.name, me.email)}</AvatarFallback>
            </Avatar>
            <span className="hidden max-w-[120px] truncate text-sm font-medium md:inline">{name}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="flex flex-col gap-1">
              <span>{name}</span>
              <span className="text-xs font-normal text-muted-foreground">{email}</span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link to="/">Overview</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/structure">Structure</Link>
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
