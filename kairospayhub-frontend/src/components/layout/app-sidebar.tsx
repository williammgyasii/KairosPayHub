import { useEffect, useState } from 'react'
import { ChevronDown, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  ClipboardCheck,
  Gift,
  LayoutDashboard,
  CalendarDays,
  Network,
  Settings,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { isSidebarNavItemActive } from '@/lib/sidebar-nav'
import { canApproveAttendance, canManageChurch, canSubmitRollCall, isCellLeader, isScopedLeader, type Me } from '@/api/me'
import { canAccessEvents } from '@/lib/calendar-events-ui'
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

const GIVINGS_NAV_GROUP: NavEntry = {
  kind: 'group',
  label: 'Givings',
  icon: Gift,
  children: [
    { to: 'givings', label: 'Campaigns', end: true },
    { to: 'givings/transactions', label: 'Transactions', end: true },
    { to: 'givings/overall', label: 'Overall givings', end: true },
  ],
}

function attendanceNavForRole(me: Me & { onboarded: true }): NavEntry {
  const role = me.role
  const children: { to: string; label: string; end?: boolean }[] = []

  if (canManageChurch(role)) {
    children.push({ to: 'attendance', label: 'Meeting types', end: true })
  }

  if (canSubmitRollCall(me)) {
    children.push({ to: 'attendance/submissions', label: 'Submissions', end: true })
  }

  if (canApproveAttendance(role)) {
    children.push({ to: 'attendance/overview', label: 'Overview', end: true })
    children.push({ to: 'attendance/approvals', label: 'Approvals', end: true })
  }

  if (children.length === 0) {
    return {
      kind: 'item',
      to: 'attendance/submissions',
      label: 'Attendance',
      icon: ClipboardCheck,
      end: true,
    }
  }

  if (children.length === 1 && isCellLeader(role) && !isScopedLeader(role) && !canManageChurch(role)) {
    return {
      kind: 'item',
      to: children[0].to,
      label: 'Attendance',
      icon: ClipboardCheck,
      end: true,
    }
  }

  return {
    kind: 'group',
    label: 'Attendance',
    icon: ClipboardCheck,
    children,
  }
}

const EVENTS_NAV_ITEM: NavEntry = {
  kind: 'item',
  to: 'events',
  label: 'Events',
  icon: CalendarDays,
  end: true,
}

function navWithAttendance(entries: NavEntry[], me: Me & { onboarded: true }): NavEntry[] {
  const givingsIndex = entries.findIndex(
    (entry) => entry.kind === 'group' && entry.label === 'Givings',
  )
  const attendance = attendanceNavForRole(me)
  const afterAttendance: NavEntry[] = [attendance]
  if (canAccessEvents(me)) {
    afterAttendance.push(EVENTS_NAV_ITEM)
  }
  if (givingsIndex === -1) return [...entries, ...afterAttendance]
  return [...entries.slice(0, givingsIndex + 1), ...afterAttendance, ...entries.slice(givingsIndex + 1)]
}

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
  GIVINGS_NAV_GROUP,
  { kind: 'item', to: 'settings', label: 'Settings', icon: Settings },
]

const LEADER_NAV: NavEntry[] = [
  { kind: 'item', to: '.', label: 'Overview', icon: LayoutDashboard, end: true },
  GIVINGS_NAV_GROUP,
]

const CELL_LEADER_NAV: NavEntry[] = [
  { kind: 'item', to: '.', label: 'Overview', icon: LayoutDashboard, end: true },
  {
    kind: 'group',
    label: 'Roster',
    icon: Users,
    children: [
      { to: 'roster', label: 'Units', end: true },
      { to: 'roster/membership', label: 'Membership', end: true },
    ],
  },
  GIVINGS_NAV_GROUP,
]

const SCOPED_LEADER_NAV: NavEntry[] = [
  { kind: 'item', to: '.', label: 'Overview', icon: LayoutDashboard, end: true },
  {
    kind: 'group',
    label: 'Roster',
    icon: Users,
    children: [
      { to: 'roster', label: 'Units', end: true },
      { to: 'roster/membership', label: 'Membership', end: true },
    ],
  },
  GIVINGS_NAV_GROUP,
]

function navForRole(me: Me & { onboarded: true }): NavEntry[] {
  if (canManageChurch(me.role)) return navWithAttendance(NAV, me)
  if (isScopedLeader(me.role)) return navWithAttendance(SCOPED_LEADER_NAV, me)
  if (isCellLeader(me.role)) return navWithAttendance(CELL_LEADER_NAV, me)
  return navWithAttendance(LEADER_NAV, me)
}

function isNavGroupActive(pathname: string, group: NavGroup) {
  return group.children.some((child) => isSidebarNavItemActive(pathname, child))
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
  const nav = navForRole(me)

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
        {nav.map((entry) =>
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
            'bg-primary text-primary-foreground shadow-md',
            collapsed ? 'ring-2 ring-primary/40' : 'ring-1 ring-primary/30',
            !collapsed &&
              'before:absolute before:inset-y-2 before:left-0 before:w-1 before:rounded-full before:bg-primary-foreground/40',
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
  const isActive = isSidebarNavItemActive(pathname, item)
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
          isActive && 'text-primary-foreground',
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
  const isCollapsible = group.children.length > 2
  const [open, setOpen] = useState(() => isActive)

  useEffect(() => {
    if (isActive) setOpen(true)
  }, [isActive])

  if (collapsed) {
    const link = (
      <NavLink
        to={defaultChild.to}
        end={defaultChild.end}
        relative="route"
        aria-current={isActive ? 'page' : undefined}
        className={navItemStyles(isActive, collapsed)}
      >
        <Icon className={cn('size-4 shrink-0', isActive && 'text-primary-foreground')} />
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
      {isCollapsible ? (
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          className={cn(
            'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide transition-colors hover:bg-accent/50',
            isActive ? 'text-primary' : 'text-muted-foreground',
          )}
        >
          <Icon className={cn('size-4 shrink-0', isActive && 'text-primary')} />
          <span className="flex-1">{group.label}</span>
          <ChevronDown
            className={cn(
              'size-4 shrink-0 transition-transform duration-200',
              open && 'rotate-180',
            )}
          />
        </button>
      ) : (
        <div
          className={cn(
            'flex items-center gap-3 px-3 py-2 text-xs font-semibold uppercase tracking-wide',
            isActive ? 'text-primary' : 'text-muted-foreground',
          )}
        >
          <Icon className={cn('size-4 shrink-0', isActive && 'text-primary')} />
          {group.label}
        </div>
      )}
      {(!isCollapsible || open) && (
        <div className="ml-3 space-y-0.5 border-l border-border/60 pl-2">
          {group.children.map((child) => {
            const childActive = isSidebarNavItemActive(pathname, child)
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
                    ? 'bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/30'
                    : 'text-muted-foreground hover:bg-accent/80 hover:text-foreground',
                )}
              >
                {child.label}
              </NavLink>
            )
          })}
        </div>
      )}
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
