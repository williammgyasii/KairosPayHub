import type { LucideIcon } from 'lucide-react'
import { isSidebarNavItemActive } from '@/lib/sidebar-nav'
import type { NavEntry } from '@/shared/lib/dashboard-nav'

export type MobileTabId = 'home' | 'attendance' | 'givings' | 'membership' | 'more'

export type MobileTab = {
  id: MobileTabId
  label: string
  to?: string
  active: boolean
}

export type MobileOverflowItem = {
  label: string
  to: string
  end?: boolean
  icon: LucideIcon
}

export type MobileTabs = {
  tabs: MobileTab[]
  overflow: MobileOverflowItem[]
}

const PROMOTED: { id: Exclude<MobileTabId, 'more'>; label: string; match: (entry: NavEntry) => boolean }[] =
  [
    {
      id: 'home',
      label: 'Home',
      match: (entry) => entry.kind === 'item' && (entry.to === '.' || entry.to === ''),
    },
    {
      id: 'attendance',
      label: 'Attendance',
      match: (entry) =>
        entry.kind === 'group'
          ? entry.label === 'Attendance'
          : entry.to === 'attendance' || entry.to.startsWith('attendance/'),
    },
    {
      id: 'givings',
      label: 'Givings',
      match: (entry) =>
        entry.kind === 'group'
          ? entry.label === 'Givings'
          : entry.to === 'givings' || entry.to.startsWith('givings/'),
    },
    {
      id: 'membership',
      label: 'Membership',
      match: (entry) =>
        entry.kind === 'group'
          ? entry.label === 'Roster'
          : entry.to === 'roster' || entry.to.startsWith('roster/'),
    },
  ]

function membershipChild(entry: NavEntry) {
  if (entry.kind !== 'group') return null
  return entry.children.find((child) => child.to === 'roster/membership' || child.to === 'membership') ?? null
}

function landingTo(entry: NavEntry, tabId?: MobileTabId): string {
  if (tabId === 'membership') {
    const member = membershipChild(entry)
    if (member) return member.to
  }
  if (entry.kind === 'item') return entry.to
  return entry.children[0]?.to ?? '.'
}

function isEntryActive(pathname: string, entry: NavEntry, tabId?: MobileTabId): boolean {
  if (tabId === 'membership') {
    const member = membershipChild(entry)
    if (member) return isSidebarNavItemActive(pathname, member)
  }
  if (entry.kind === 'item') return isSidebarNavItemActive(pathname, entry)
  return entry.children.some((child) => isSidebarNavItemActive(pathname, child))
}

function flattenDestinations(entries: NavEntry[]): MobileOverflowItem[] {
  const items: MobileOverflowItem[] = []
  for (const entry of entries) {
    if (entry.kind === 'item') {
      items.push({ label: entry.label, to: entry.to, end: entry.end, icon: entry.icon })
      continue
    }
    for (const child of entry.children) {
      items.push({ label: child.label, to: child.to, end: child.end, icon: child.icon })
    }
  }
  return items
}

/** Tab landing stays on the tab; sibling destinations still need a home (e.g. Units). */
function leftoverChildren(entry: NavEntry, tabId: MobileTabId): MobileOverflowItem[] {
  if (entry.kind !== 'group') return []
  const landing = landingTo(entry, tabId)
  return entry.children
    .filter((child) => child.to !== landing)
    .map((child) => ({ label: child.label, to: child.to, end: child.end, icon: child.icon }))
}

export function createMobileTabs(entries: NavEntry[], pathname: string): MobileTabs {
  const promoted = PROMOTED.flatMap((slot) => {
    const entry = entries.find(slot.match)
    if (!entry) return []
    return [{ slot, entry }]
  })

  const leftover = entries.filter((entry) => !promoted.some(({ entry: picked }) => picked === entry))
  const overflow = [
    ...flattenDestinations(leftover),
    ...promoted.flatMap(({ slot, entry }) => leftoverChildren(entry, slot.id)),
  ]

  const tabs: MobileTab[] = promoted.map(({ slot, entry }) => ({
    id: slot.id,
    label:
      slot.id === 'membership' ? membershipChild(entry)?.label ?? slot.label : slot.label,
    to: landingTo(entry, slot.id),
    active: isEntryActive(pathname, entry, slot.id),
  }))

  if (overflow.length > 0) {
    const promotedActive = tabs.some((tab) => tab.active)
    tabs.push({
      id: 'more',
      label: 'More',
      active:
        !promotedActive &&
        overflow.some((item) => isSidebarNavItemActive(pathname, { to: item.to, end: item.end })),
    })
  }

  return { tabs, overflow }
}

/** Center slot when the bar has an odd count. Even counts have no standout. */
export function emphasizedTabIndex(tabCount: number): number {
  if (tabCount < 3 || tabCount % 2 === 0) return -1
  return Math.floor(tabCount / 2)
}
