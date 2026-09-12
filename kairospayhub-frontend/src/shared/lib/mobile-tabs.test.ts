import { describe, expect, it } from 'vitest'
import type { Me } from '@/api/auth'
import { navForRole, type NavEntry } from '@/shared/lib/dashboard-nav'
import { createMobileTabs, emphasizedTabIndex } from '@/shared/lib/mobile-tabs'

function me(
  role: Extract<Me, { onboarded: true }>['role'],
  extra: Partial<Extract<Me, { onboarded: true }>> = {},
): Me & { onboarded: true } {
  return {
    onboarded: true,
    id: 'u1',
    churchId: 'c1',
    churchName: 'Grace',
    churchLogoUrl: null,
    organizationId: 'o1',
    role,
    legacyChurchId: null,
    email: 'a@example.com',
    name: 'Ada',
    ...extra,
  }
}

function tabIds(entries: NavEntry[], pathname = '/') {
  return createMobileTabs(entries, pathname).tabs.map((tab) => tab.id)
}

function tabLabels(entries: NavEntry[], pathname = '/') {
  return createMobileTabs(entries, pathname).tabs.map((tab) => tab.label)
}

function overflowLabels(entries: NavEntry[], pathname = '/') {
  return createMobileTabs(entries, pathname).overflow.map((item) => item.label)
}

describe('createMobileTabs', () => {
  it('promotes Home, Attendance, Givings, Roster, More for a church manager', () => {
    const tree = navForRole(me('Pastor'))
    expect(tabLabels(tree)).toEqual(['Home', 'Attendance', 'Givings', 'Roster', 'More'])
    expect(overflowLabels(tree)).toEqual(
      expect.arrayContaining([
        'Structure',
        'Settings',
        'Events',
        'Access',
        'Membership',
        'Metrics',
        'Transactions',
      ]),
    )
    expect(overflowLabels(tree)).not.toEqual(
      expect.arrayContaining(['Units', 'Campaigns', 'Meeting types']),
    )
  })

  it('puts Membership in More instead of hiding it under the Roster tab', () => {
    const tree = navForRole(me('Pastor'))
    const overflow = createMobileTabs(tree, '/').overflow
    expect(overflow.some((item) => item.to === 'roster/membership')).toBe(true)
    expect(overflow.some((item) => item.to === 'roster' && item.label === 'Units')).toBe(false)
  })

  it('includes Roster for a cell leader when the tree has Roster, never Structure as a tab', () => {
    const tree = navForRole(me('CellLeader', { canMarkAttendance: true }))
    expect(tabIds(tree)).toEqual(['home', 'attendance', 'givings', 'roster', 'more'])
    expect(tabLabels(tree)).not.toContain('Structure')
    expect(overflowLabels(tree)).toContain('Events')
    expect(overflowLabels(tree)).not.toContain('Structure')
  })

  it('omits Roster when the tree has no Roster group', () => {
    const tree = navForRole(me('Leader'))
    expect(tabIds(tree)).toEqual(['home', 'attendance', 'givings', 'more'])
    expect(tabLabels(tree)).not.toContain('Roster')
    expect(overflowLabels(tree)).toEqual(expect.arrayContaining(['Transactions', 'Overall givings']))
    expect(overflowLabels(tree)).not.toContain('Campaigns')
  })

  it('marks Attendance active on a nested attendance path', () => {
    const tree = navForRole(me('Pastor'))
    const { tabs } = createMobileTabs(tree, '/attendance/overview')
    const active = tabs.filter((tab) => tab.active).map((tab) => tab.id)
    expect(active).toEqual(['attendance'])
  })

  it('marks More active on Settings', () => {
    const tree = navForRole(me('Pastor'))
    const { tabs, overflow } = createMobileTabs(tree, '/settings')
    expect(overflow.some((item) => item.to === 'settings')).toBe(true)
    expect(tabs.filter((tab) => tab.active).map((tab) => tab.id)).toEqual(['more'])
  })

  it('uses each section’s existing landing path', () => {
    const pastor = createMobileTabs(navForRole(me('Pastor')), '/')
    expect(pastor.tabs.find((tab) => tab.id === 'home')?.to).toBe('.')
    expect(pastor.tabs.find((tab) => tab.id === 'attendance')?.to).toBe('attendance')
    expect(pastor.tabs.find((tab) => tab.id === 'givings')?.to).toBe('givings')
    expect(pastor.tabs.find((tab) => tab.id === 'roster')?.to).toBe('roster')
    expect(pastor.tabs.find((tab) => tab.id === 'more')?.to).toBeUndefined()

    const cell = createMobileTabs(navForRole(me('CellLeader', { canMarkAttendance: true })), '/')
    expect(cell.tabs.find((tab) => tab.id === 'attendance')?.to).toBe('attendance/submissions')
  })

  it('stands out the middle tab only on odd-length bars', () => {
    expect(emphasizedTabIndex(5)).toBe(2)
    expect(emphasizedTabIndex(3)).toBe(1)
    expect(emphasizedTabIndex(4)).toBe(-1)
    expect(emphasizedTabIndex(2)).toBe(-1)
  })
})
