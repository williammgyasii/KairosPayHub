import type { ReactNode } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Bookmark, LayoutDashboard, LogOut, MessageCircle, Search } from 'lucide-react'
import { signOutOperator } from '@/features/outreach/lib/operator-session'
import { KairosLogo, KairosWordmark } from '@/shared/layout/kairos-logo'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/lib/utils'

function navClass({ isActive }: { isActive: boolean }) {
  return cn(
    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium',
    isActive
      ? 'bg-primary text-primary-foreground shadow-md'
      : 'text-muted-foreground hover:bg-accent/80 hover:text-foreground',
  )
}

export function OperatorShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const title = location.pathname.startsWith('/superadmin/search')
    ? 'Search leads'
    : location.pathname.startsWith('/superadmin/saved')
      ? 'Saved leads'
      : location.pathname.startsWith('/superadmin/reached')
        ? 'Reached'
        : 'Dashboard'

  const chat = location.pathname.startsWith('/superadmin/reached')

  function signOut() {
    signOutOperator()
    navigate('/superadmin/login')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-muted/20">
      <aside className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col overflow-y-auto border-r bg-card">
        <div className="flex items-center gap-3 border-b px-4 py-4">
          <KairosLogo size="sm" />
          <div className="min-w-0">
            <KairosWordmark />
            <p className="truncate text-xs text-muted-foreground">Outreach</p>
          </div>
        </div>
        <nav aria-label="Outreach" className="flex flex-1 flex-col gap-1 p-2">
          <NavLink to="/superadmin" end className={navClass}>
            <LayoutDashboard className="size-4" />
            Dashboard
          </NavLink>
          <NavLink to="/superadmin/search" className={navClass}>
            <Search className="size-4" />
            Search leads
          </NavLink>
          <NavLink to="/superadmin/saved" className={navClass}>
            <Bookmark className="size-4" />
            Saved leads
          </NavLink>
          <NavLink to="/superadmin/reached" className={navClass}>
            <MessageCircle className="size-4" />
            Reached
          </NavLink>
        </nav>
      </aside>

      <div className="flex h-screen min-w-0 flex-1 flex-col pl-64">
        <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border/50 bg-background/80 px-6 backdrop-blur-md">
          <p className="text-sm font-semibold">{title}</p>
          <Button type="button" variant="outline" onClick={signOut}>
            <LogOut className="size-4" />
            Sign out
          </Button>
        </header>
        <div
          className={cn(
            'flex min-h-0 min-w-0 flex-1 flex-col',
            chat ? 'overflow-hidden' : 'overflow-y-auto px-4 py-5 sm:px-6 sm:py-6',
          )}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
