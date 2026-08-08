import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  Gift,
  LayoutDashboard,
  Network,
  Settings,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Me } from '@/api/me'
import { ChurchBrand } from '@/components/layout/church-brand'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { useSidebar } from '@/components/layout/sidebar-context'

const SIDEBAR_WIDTH_EXPANDED = 'w-64'
const SIDEBAR_WIDTH_COLLAPSED = 'w-[72px]'

type NavItem = {
  to: string
  label: string
  icon: typeof LayoutDashboard
  end?: boolean
  disabled?: boolean
}

type NavGroup = {
  label: string
  icon: typeof Users
  children: { to: string; label: string; end?: boolean }[]
}

type NavEntry =
  | ({ kind: 'item' } & NavItem)
  | ({ kind: 'group' } & NavGroup)

const NAV: NavEntry[] = [
  { kind: 'item', to: '.', label: 'Overview', icon: LayoutDashboard, end: true },
  { kind: 'item', to: 'structure', label: 'Structure', icon: Network, end: true },
  {
    kind: 'group',
    label: 'Roster',
    icon: Users,
    children: [
      { to: 'roster', label: 'Units', end: true },
      { to: 'roster/membership', label: 'Membership', end: true },
    ],
  },
  { kind: 'item', to: 'givings', label: 'Givings', icon: Gift, end: true },
  { kind: 'item', to: 'settings', label: 'Settings', icon: Settings, end: true },
]

function normalizePath(pathname: string) {
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.slice(0, -1)
  }
  return pathname
}

function isNavItemActive(pathname: string, item: Pick<NavItem, 'to' | 'end'>) {
  const current = normalizePath(pathname)

  const target =
    item.to === '.' || item.to === ''
      ? '/'
      : `/${item.to.replace(/^\//, '')}`

  if (item.end ?? false) return current === target
  return current === target || current.startsWith(`${target}/`)
}

function isNavGroupActive(pathname: string, group: NavGroup) {
  if (group.label === 'Roster' && pathname.startsWith('/roster/units/')) return true
  return group.children.some((child) => isNavItemActive(pathname, child))
}

interface AppSidebarProps {
  me: Me & { onboarded: true }
  className?: string
  /** Force expanded layout (mobile drawer). */
  expanded?: boolean
}

export function AppSidebar({ me, className, expanded = false }: AppSidebarProps) {
  const { collapsed: contextCollapsed, toggleCollapsed } = useSidebar()
  const collapsed = expanded ? false : contextCollapsed
  const churchLabel = me.churchName ?? 'Your church'
  const showCollapseControl = !expanded

  return (
    <aside
      className={cn(
        'relative flex h-full flex-col border-r bg-card transition-[width] duration-200 ease-in-out',
        collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED,
        className,
      )}
    >
      <div
        className={cn(
          'flex shrink-0 border-b',
          collapsed ? 'h-[72px] items-center justify-center px-0' : 'px-4 py-4',
        )}
      >
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center justify-center">
                <ChurchBrand
                  churchName={me.churchName}
                  logoUrl={me.churchLogoUrl}
                  collapsed
                />
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">{churchLabel}</TooltipContent>
          </Tooltip>
        ) : (
          <ChurchBrand churchName={me.churchName} logoUrl={me.churchLogoUrl} />
        )}
      </div>

      <nav
        className={cn(
          'flex flex-1 flex-col pb-4',
          collapsed ? 'items-center gap-2.5 px-2 pt-4' : 'gap-1 p-2',
        )}
      >
        {NAV.map((entry) =>
          entry.kind === 'item' ? (
            <SidebarNavItem key={entry.to} item={entry} collapsed={collapsed} />
          ) : (
            <SidebarNavGroup key={entry.label} group={entry} collapsed={collapsed} />
          ),
        )}
      </nav>

      {showCollapseControl && (
        <SidebarCollapseRail collapsed={collapsed} onToggle={toggleCollapsed} />
      )}
    </aside>
  )
}

function SidebarCollapseRail({
  collapsed,
  onToggle,
}: {
  collapsed: boolean
  onToggle: () => void
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="absolute -right-3 top-[4.5rem] z-10 hidden size-6 rounded-full border-border/80 bg-background shadow-sm lg:inline-flex"
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <PanelLeftOpen className="size-3.5" />
          ) : (
            <PanelLeftClose className="size-3.5" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right">
        {collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      </TooltipContent>
    </Tooltip>
  )
}

function navItemStyles(isActive: boolean, collapsed: boolean, disabled?: boolean) {
  return cn(
    'group flex items-center text-sm font-medium transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ring',
    collapsed
      ? 'size-10 justify-center rounded-xl p-0'
      : 'relative w-full gap-3 rounded-lg px-3 py-2.5',
    disabled
      ? 'pointer-events-none opacity-40'
      : isActive
        ? cn(
            'bg-primary/12 text-primary shadow-sm',
            collapsed ? 'ring-2 ring-primary/20' : 'ring-1 ring-primary/15',
            !collapsed &&
              'before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full before:bg-primary',
          )
        : cn(
            'text-muted-foreground hover:bg-accent/80 hover:text-foreground',
            collapsed ? 'hover:ring-1 hover:ring-border' : 'hover:shadow-sm',
          ),
  )
}

function SidebarNavItem({
  item,
  collapsed,
}: {
  item: NavItem
  collapsed: boolean
}) {
  const { pathname } = useLocation()
  const isActive = isNavItemActive(pathname, item)
  const Icon = item.icon

  const link = (
    <NavLink
      to={item.to}
      end={item.end}
      relative="route"
      aria-current={isActive ? 'page' : undefined}
      className={navItemStyles(isActive, collapsed, item.disabled)}
      onClick={(e) => item.disabled && e.preventDefault()}
    >
      <Icon
        className={cn(
          'size-4 shrink-0 transition-transform duration-150',
          !item.disabled && !isActive && 'group-hover:scale-105',
          isActive && 'text-primary',
        )}
      />
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

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right">{item.disabled ? `${item.label} (soon)` : item.label}</TooltipContent>
      </Tooltip>
    )
  }

  return link
}

function SidebarNavGroup({ group, collapsed }: { group: NavGroup; collapsed: boolean }) {
  const { pathname } = useLocation()
  const isActive = isNavGroupActive(pathname, group)
  const Icon = group.icon
  const defaultChild = group.children[0]

  if (collapsed) {
    const link = (
      <NavLink
        to={defaultChild.to}
        end={defaultChild.end}
        relative="route"
        aria-current={isActive ? 'page' : undefined}
        className={navItemStyles(isActive, collapsed)}
      >
        <Icon className={cn('size-4 shrink-0', isActive && 'text-primary')} />
      </NavLink>
    )

    return (
      <Tooltip>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right">
          <p className="font-medium">{group.label}</p>
          <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
            {group.children.map((child) => (
              <li key={child.to}>{child.label}</li>
            ))}
          </ul>
        </TooltipContent>
      </Tooltip>
    )
  }

  return (
    <div className="space-y-0.5">
      <div
        className={cn(
          'flex items-center gap-3 px-3 py-2 text-xs font-semibold uppercase tracking-wide',
          isActive ? 'text-primary' : 'text-muted-foreground',
        )}
      >
        <Icon className="size-4 shrink-0" />
        {group.label}
      </div>
      <div className="ml-3 space-y-0.5 border-l border-border/60 pl-2">
        {group.children.map((child) => {
          const childActive = isNavItemActive(pathname, child)
          return (
            <NavLink
              key={child.to}
              to={child.to}
              end={child.end}
              relative="route"
              aria-current={childActive ? 'page' : undefined}
              className={cn(
                'block rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                childActive
                  ? 'bg-primary/12 text-primary ring-1 ring-primary/15'
                  : 'text-muted-foreground hover:bg-accent/80 hover:text-foreground',
              )}
            >
              {child.label}
            </NavLink>
          )
        })}
      </div>
    </div>
  )
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
      <AppSidebar me={me} expanded className="relative z-10 shadow-xl" />
    </div>
  )
}
