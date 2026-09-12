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
  it('promotes Home, Attendance, Givings, Membership, More for a church manager', () => {
    const tree = navForRole(me('Pastor'))
    expect(tabLabels(tree)).toEqual(['Home', 'Attendance', 'Givings', 'Membership', 'More'])
    expect(overflowLabels(tree)).toEqual(
      expect.arrayContaining([
        'Structure',
        'Settings',
        'Events',
        'Access',
        'Units',
        'Metrics',
        'Share files',
        'Transactions',
      ]),
    )
    expect(overflowLabels(tree)).not.toEqual(
      expect.arrayContaining(['Membership', 'Campaigns', 'Meeting types']),
    )
  })

  it('puts Units in More instead of hiding it under the Membership tab', () => {
    const tree = navForRole(me('Pastor'))
    const overflow = createMobileTabs(tree, '/').overflow
    expect(overflow.some((item) => item.to === 'roster' && item.label === 'Units')).toBe(true)
    expect(overflow.some((item) => item.to === 'roster/membership')).toBe(false)
  })

  it('includes Membership for a cell leader when the tree has Roster, never Structure as a tab', () => {
    const tree = navForRole(me('CellLeader', { canMarkAttendance: true }))
    expect(tabIds(tree)).toEqual(['home', 'attendance', 'givings', 'membership', 'more'])
    expect(tabLabels(tree)).not.toContain('Structure')
    expect(overflowLabels(tree)).toContain('Events')
    expect(overflowLabels(tree)).not.toContain('Structure')
  })

  it('omits Membership when the tree has no Roster group', () => {
    const tree = navForRole(me('Leader'))
    expect(tabIds(tree)).toEqual(['home', 'attendance', 'givings', 'more'])
    expect(tabLabels(tree)).not.toContain('Membership')
    expect(overflowLabels(tree)).toEqual(expect.arrayContaining(['Transactions', 'Overall givings']))
    expect(overflowLabels(tree)).not.toContain('Campaigns')
  })

  it('marks Attendance active on a nested attendance path', () => {
    const tree = navForRole(me('Pastor'))
    const { tabs } = createMobileTabs(tree, '/attendance/overview')
    const active = tabs.filter((tab) => tab.active).map((tab) => tab.id)
    expect(active).toEqual(['attendance'])
  })

  it('marks Membership active on membership, More on Units', () => {
    const tree = navForRole(me('Pastor'))
    const membership = createMobileTabs(tree, '/roster/membership')
    expect(membership.tabs.filter((tab) => tab.active).map((tab) => tab.id)).toEqual(['membership'])

    const units = createMobileTabs(tree, '/roster')
    expect(units.tabs.filter((tab) => tab.active).map((tab) => tab.id)).toEqual(['more'])
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
    expect(pastor.tabs.find((tab) => tab.id === 'membership')?.to).toBe('roster/membership')
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
