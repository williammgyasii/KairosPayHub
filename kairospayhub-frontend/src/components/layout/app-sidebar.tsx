import { NavLink } from 'react-router-dom'
import {
  Gift,
  LayoutDashboard,
  Network,
  Settings,
} from 'lucide-react'
import { cn, initials } from '@/lib/utils'
import { displayName, type Me } from '@/api/me'
import { useAuth } from '@/auth/AuthContext'
import { ChurchBrand } from '@/components/layout/church-brand'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useSidebar } from '@/components/layout/sidebar-context'

type NavItem = {
  to: string
  label: string
  icon: typeof LayoutDashboard
  end?: boolean
  disabled?: boolean
}

const NAV: NavItem[] = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/structure', label: 'Structure', icon: Network },
  { to: '/programs', label: 'Programs', icon: Gift, disabled: true },
  { to: '/settings', label: 'Settings', icon: Settings },
]

interface AppSidebarProps {
  me: Me & { onboarded: true }
  className?: string
}

export function AppSidebar({ me, className }: AppSidebarProps) {
  const { email } = useAuth()
  const { collapsed } = useSidebar()
  const name = displayName(me, email)
  const churchLabel = me.churchName ?? 'Your church'

  const brand = <ChurchBrand churchName={me.churchName} logoUrl={me.churchLogoUrl} collapsed={collapsed} />

  return (
    <aside
      className={cn(
        'flex h-full flex-col border-r bg-card transition-[width] duration-200 ease-in-out',
        collapsed ? 'w-[72px]' : 'w-64',
        className,
      )}
    >
      <div
        className={cn(
          'border-b px-3 py-4',
          collapsed ? 'flex justify-center px-2 py-3' : 'px-4',
        )}
      >
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <div>{brand}</div>
            </TooltipTrigger>
            <TooltipContent side="right">{churchLabel}</TooltipContent>
          </Tooltip>
        ) : (
          <ChurchBrand churchName={me.churchName} logoUrl={me.churchLogoUrl} collapsed={collapsed} />
        )}
      </div>

      <nav className="flex-1 space-y-1 p-2">
        {NAV.map((item) => (
          <SidebarNavItem key={item.to} item={item} collapsed={collapsed} />
        ))}
      </nav>

      <div className="border-t p-3">
        <div className={cn('flex items-center gap-3', collapsed && 'justify-center')}>
          <Avatar className="h-9 w-9">
            <AvatarFallback className="text-xs">{initials(me.name, me.email)}</AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{name}</p>
              <Badge variant="secondary" className="mt-1">
                {me.role}
              </Badge>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}

function SidebarNavItem({
  item,
  collapsed,
}: {
  item: NavItem
  collapsed: boolean
}) {
  const Icon = item.icon

  const link = (
    <NavLink
      to={item.to}
      end={item.end ?? false}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          collapsed && 'justify-center px-2',
          item.disabled
            ? 'pointer-events-none opacity-40'
            : isActive
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
        )
      }
      aria-disabled={item.disabled}
      onClick={(e) => item.disabled && e.preventDefault()}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && (
        <span className="flex flex-1 items-center justify-between gap-2">
          {item.label}
          {item.disabled && (
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Soon</span>
          )}
        </span>
      )}
    </NavLink>
  )

  if (collapsed && !item.disabled) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
    )
  }

  return link
}

export function MobileSidebarOverlay({ me, open, onClose }: AppSidebarProps & { open: boolean; onClose: () => void }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close menu"
        onClick={onClose}
      />
      <AppSidebar me={me} className="relative z-10 w-64 shadow-xl" />
    </div>
  )
}
