import { useEffect, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  BarChart3,
  CalendarCog,
  CalendarDays,
  ChevronDown,
  ClipboardCheck,
  ClipboardList,
  FolderTree,
  HandCoins,
  Layers,
  LayoutDashboard,
  Megaphone,
  PanelLeftClose,
  PanelLeftOpen,
  PieChart,
  Receipt,
  Settings2,
  ShieldCheck,
  UserCheck,
  UsersRound,
} from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { isSidebarNavItemActive } from '@/lib/sidebar-nav'
import {
  canApproveAttendance,
  canManageChurch,
  canSubmitRollCall,
  isCellLeader,
  isScopedLeader,
  type Me,
} from '@/api/auth'
import { canAccessEvents } from '@/lib/calendar-events-ui'
import { ChurchBrand } from '@/components/layout/church-brand'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useSidebar } from '@/components/layout/sidebar-context'

const SIDEBAR_WIDTH_EXPANDED = 'w-64'
const SIDEBAR_WIDTH_COLLAPSED = 'w-[72px]'

type NavChild = {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
}

type NavItem = {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
  disabled?: boolean
}

type NavGroup = {
  label: string
  icon: LucideIcon
  children: NavChild[]
}

type NavEntry =
  | ({ kind: 'item' } & NavItem)
  | ({ kind: 'group' } & NavGroup)

const ROSTER_CHILDREN: NavChild[] = [
  { to: 'roster', label: 'Units', icon: FolderTree, end: true },
  { to: 'roster/membership', label: 'Membership', icon: UserCheck, end: true },
]

const GIVINGS_CHILDREN: NavChild[] = [
  { to: 'givings', label: 'Campaigns', icon: Megaphone, end: true },
  { to: 'givings/transactions', label: 'Transactions', icon: Receipt, end: true },
  { to: 'givings/overall', label: 'Overall givings', icon: PieChart, end: true },
]

const GIVINGS_NAV_GROUP: NavEntry = {
  kind: 'group',
  label: 'Givings',
  icon: HandCoins,
  children: GIVINGS_CHILDREN,
}

function attendanceNavForRole(me: Me & { onboarded: true }): NavEntry {
  const role = me.role
  const children: NavChild[] = []

  if (canManageChurch(role)) {
    children.push({ to: 'attendance', label: 'Meeting types', icon: CalendarCog, end: true })
  }

  if (canSubmitRollCall(me)) {
    children.push({ to: 'attendance/submissions', label: 'Submissions', icon: ClipboardList, end: true })
  }

  if (canApproveAttendance(role)) {
    children.push({ to: 'attendance/overview', label: 'Overview', icon: BarChart3, end: true })
    children.push({ to: 'attendance/approvals', label: 'Approvals', icon: ShieldCheck, end: true })
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
  { kind: 'item', to: '.', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { kind: 'item', to: 'structure', label: 'Structure', icon: Layers, end: true },
  {
    kind: 'group',
    label: 'Roster',
    icon: UsersRound,
    children: ROSTER_CHILDREN,
  },
  GIVINGS_NAV_GROUP,
  { kind: 'item', to: 'settings', label: 'Settings', icon: Settings2 },
]

const LEADER_NAV: NavEntry[] = [
  { kind: 'item', to: '.', label: 'Dashboard', icon: LayoutDashboard, end: true },
  GIVINGS_NAV_GROUP,
]

const CELL_LEADER_NAV: NavEntry[] = [
  { kind: 'item', to: '.', label: 'Dashboard', icon: LayoutDashboard, end: true },
  {
    kind: 'group',
    label: 'Roster',
    icon: UsersRound,
    children: ROSTER_CHILDREN,
  },
  GIVINGS_NAV_GROUP,
]

const SCOPED_LEADER_NAV: NavEntry[] = [
  { kind: 'item', to: '.', label: 'Dashboard', icon: LayoutDashboard, end: true },
  {
    kind: 'group',
    label: 'Roster',
    icon: UsersRound,
    children: ROSTER_CHILDREN,
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
  const [open, setOpen] = useState(() => isActive)

  useEffect(() => {
    if (isActive) setOpen(true)
  }, [isActive])

  if (collapsed) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={group.label}
            className={navItemStyles(isActive, collapsed)}
          >
            <Icon className={cn('size-4 shrink-0', isActive && 'text-primary-foreground')} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start" className="w-52">
          <DropdownMenuLabel className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {group.label}
          </DropdownMenuLabel>
          {group.children.map((child) => {
            const ChildIcon = child.icon
            const childActive = isSidebarNavItemActive(pathname, child)
            return (
              <DropdownMenuItem key={child.to} asChild className={cn(childActive && 'bg-accent')}>
                <NavLink to={child.to} end={child.end} relative="route" className="flex items-center gap-2">
                  <ChildIcon className="size-4 shrink-0 text-muted-foreground" />
                  {child.label}
                </NavLink>
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className={cn(
          'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-all duration-150',
          isActive
            ? 'bg-primary/10 text-primary ring-1 ring-primary/20'
            : 'text-muted-foreground hover:bg-accent/80 hover:text-foreground',
        )}
      >
        <Icon className={cn('size-4 shrink-0', isActive && 'text-primary')} />
        <span className="flex-1">{group.label}</span>
        <ChevronDown
          className={cn(
            'size-4 shrink-0 text-muted-foreground transition-transform duration-200',
            open && 'rotate-180',
          )}
        />
      </button>

      <div
        className={cn(
          'grid transition-[grid-template-rows,opacity] duration-200 ease-out',
          open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
        )}
      >
        <div className="overflow-hidden">
          <div className="ml-2 space-y-0.5 rounded-lg bg-muted/35 p-1.5">
            {group.children.map((child) => {
              const ChildIcon = child.icon
              const childActive = isSidebarNavItemActive(pathname, child)
              return (
                <NavLink
                  key={child.to}
                  to={child.to}
                  end={child.end}
                  relative="route"
                  aria-current={childActive ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors',
                    childActive
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-background/80 hover:text-foreground',
                  )}
                >
                  <ChildIcon
                    className={cn(
                      'size-3.5 shrink-0',
                      childActive ? 'text-primary-foreground' : 'text-muted-foreground',
                    )}
                  />
                  {child.label}
                </NavLink>
              )
            })}
          </div>
        </div>
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
