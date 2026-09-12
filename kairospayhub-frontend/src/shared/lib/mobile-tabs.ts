import type { LucideIcon } from 'lucide-react'
import { isSidebarNavItemActive } from '@/lib/sidebar-nav'
import type { NavEntry } from '@/shared/lib/dashboard-nav'

export type MobileTabId = 'home' | 'attendance' | 'givings' | 'roster' | 'more'

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
      id: 'roster',
      label: 'Roster',
      match: (entry) =>
        entry.kind === 'group'
          ? entry.label === 'Roster'
          : entry.to === 'roster' || entry.to.startsWith('roster/'),
    },
  ]

function landingTo(entry: NavEntry): string {
  if (entry.kind === 'item') return entry.to
  return entry.children[0]?.to ?? '.'
}

function isEntryActive(pathname: string, entry: NavEntry): boolean {
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

/** Tab landing stays on the tab; sibling destinations still need a home (e.g. Membership). */
function leftoverChildren(entry: NavEntry): MobileOverflowItem[] {
  if (entry.kind !== 'group') return []
  const landing = landingTo(entry)
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
    ...promoted.flatMap(({ entry }) => leftoverChildren(entry)),
  ]

  const tabs: MobileTab[] = promoted.map(({ slot, entry }) => ({
    id: slot.id,
    label: slot.label,
    to: landingTo(entry),
    active: isEntryActive(pathname, entry),
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
