import type { LucideIcon } from 'lucide-react'
import {
  BarChart3,
  CalendarCog,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  FolderTree,
  HandCoins,
  Layers,
  LayoutDashboard,
  Megaphone,
  PieChart,
  Receipt,
  Settings2,
  ShieldCheck,
  UserCheck,
  UsersRound,
} from 'lucide-react'
import {
  canApproveAttendance,
  canManageChurch,
  canSubmitRollCall,
  canViewAttendanceMetrics,
  isCellLeader,
  isScopedLeader,
  type Me,
} from '@/api/auth'
import { shouldShowAccessNav } from '@/features/access'
import { canAccessEvents } from '@/features/events'

export type NavChild = {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
  badgeCount?: number
}

export type NavItem = {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
  disabled?: boolean
  badgeCount?: number
}

export type NavGroup = {
  label: string
  icon: LucideIcon
  children: NavChild[]
  badgeCount?: number
}

export type NavEntry = ({ kind: 'item' } & NavItem) | ({ kind: 'group' } & NavGroup)

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
    children.push({
      to: 'attendance/submissions',
      label: 'Mark attendance',
      icon: ClipboardList,
      end: true,
    })
  }

  if (canViewAttendanceMetrics(role)) {
    children.push({ to: 'attendance/overview', label: 'Metrics', icon: BarChart3 })
  }

  if (canApproveAttendance(role)) {
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
  const givingsIndex = entries.findIndex((entry) => entry.kind === 'group' && entry.label === 'Givings')
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
  { kind: 'item', to: 'access', label: 'Access', icon: ShieldCheck },
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

function withoutAccessNav(entries: NavEntry[]): NavEntry[] {
  return entries.filter((entry) => entry.kind !== 'item' || entry.to !== 'access')
}

export function navForRole(me: Me & { onboarded: true }): NavEntry[] {
  if (canManageChurch(me.role)) {
    const entries = navWithAttendance(NAV, me)
    return shouldShowAccessNav(me.role) ? entries : withoutAccessNav(entries)
  }
  if (isScopedLeader(me.role)) return navWithAttendance(SCOPED_LEADER_NAV, me)
  if (isCellLeader(me.role)) return navWithAttendance(CELL_LEADER_NAV, me)
  return navWithAttendance(LEADER_NAV, me)
}

export function applyAttendanceBadges(entries: NavEntry[], pendingApprovalCount: number): NavEntry[] {
  if (pendingApprovalCount <= 0) return entries

  return entries.map((entry) => {
    if (entry.kind !== 'group' || entry.label !== 'Attendance') return entry

    return {
      ...entry,
      badgeCount: pendingApprovalCount,
      children: entry.children.map((child) =>
        child.to === 'attendance/approvals'
          ? { ...child, badgeCount: pendingApprovalCount }
          : child,
      ),
    }
  })
}

export function applyGivingsBadges(entries: NavEntry[], awaitingApprovalCount: number): NavEntry[] {
  if (awaitingApprovalCount <= 0) return entries

  return entries.map((entry) => {
    if (entry.kind !== 'group' || entry.label !== 'Givings') return entry

    return {
      ...entry,
      badgeCount: awaitingApprovalCount,
      children: entry.children.map((child) =>
        child.to === 'givings/transactions'
          ? { ...child, badgeCount: awaitingApprovalCount }
          : child,
      ),
    }
  })
}
