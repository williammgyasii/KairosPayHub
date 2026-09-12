import { describe, expect, it } from 'vitest'
import type { Me } from '@/api/auth'
import { navForRole, type NavEntry } from '@/shared/lib/dashboard-nav'

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

function summary(entries: NavEntry[]) {
  return entries.map((entry) =>
    entry.kind === 'item'
      ? { kind: 'item' as const, to: entry.to, label: entry.label }
      : {
          kind: 'group' as const,
          label: entry.label,
          children: entry.children.map((child) => ({ to: child.to, label: child.label })),
        },
  )
}

describe('navForRole', () => {
  it('lists church-manager destinations including Structure, Access, and Settings', () => {
    expect(summary(navForRole(me('Pastor')))).toEqual([
      { kind: 'item', to: '.', label: 'Dashboard' },
      { kind: 'item', to: 'structure', label: 'Structure' },
      {
        kind: 'group',
        label: 'Roster',
        children: [
          { to: 'roster', label: 'Units' },
          { to: 'roster/membership', label: 'Membership' },
        ],
      },
      {
        kind: 'group',
        label: 'Givings',
        children: [
          { to: 'givings', label: 'Campaigns' },
          { to: 'givings/transactions', label: 'Transactions' },
          { to: 'givings/overall', label: 'Overall givings' },
        ],
      },
      {
        kind: 'group',
        label: 'Attendance',
        children: [
          { to: 'attendance', label: 'Meeting types' },
          { to: 'attendance/overview', label: 'Metrics' },
        ],
      },
      { kind: 'item', to: 'events', label: 'Events' },
      { kind: 'item', to: 'access', label: 'Access' },
      { kind: 'item', to: 'settings', label: 'Settings' },
    ])
  })

  it('hides Access for church admin', () => {
    const labels = summary(navForRole(me('ChurchAdmin'))).map((entry) =>
      entry.kind === 'item' ? entry.label : entry.label,
    )
    expect(labels).toContain('Structure')
    expect(labels).toContain('Settings')
    expect(labels).not.toContain('Access')
  })

  it('gives a cell leader Roster, Givings, Attendance, and Events — not Structure', () => {
    expect(summary(navForRole(me('CellLeader', { canMarkAttendance: true })))).toEqual([
      { kind: 'item', to: '.', label: 'Dashboard' },
      {
        kind: 'group',
        label: 'Roster',
        children: [
          { to: 'roster', label: 'Units' },
          { to: 'roster/membership', label: 'Membership' },
        ],
      },
      {
        kind: 'group',
        label: 'Givings',
        children: [
          { to: 'givings', label: 'Campaigns' },
          { to: 'givings/transactions', label: 'Transactions' },
          { to: 'givings/overall', label: 'Overall givings' },
        ],
      },
      { kind: 'item', to: 'attendance/submissions', label: 'Attendance' },
      { kind: 'item', to: 'events', label: 'Events' },
    ])
  })

  it('gives a scoped leader Roster plus attendance approvals', () => {
    const labels = summary(navForRole(me('PFCCManager', { canMarkAttendance: true }))).map(
      (entry) => entry.label,
    )
    expect(labels).toEqual(['Dashboard', 'Roster', 'Givings', 'Attendance', 'Events'])
    const attendance = navForRole(me('PFCCManager', { canMarkAttendance: true })).find(
      (entry) => entry.kind === 'group' && entry.label === 'Attendance',
    )
    expect(attendance?.kind === 'group' && attendance.children.map((c) => c.to)).toEqual([
      'attendance/submissions',
      'attendance/overview',
      'attendance/approvals',
    ])
  })

  it('omits Roster for a plain leader', () => {
    expect(summary(navForRole(me('Leader')))).toEqual([
      { kind: 'item', to: '.', label: 'Dashboard' },
      {
        kind: 'group',
        label: 'Givings',
        children: [
          { to: 'givings', label: 'Campaigns' },
          { to: 'givings/transactions', label: 'Transactions' },
          { to: 'givings/overall', label: 'Overall givings' },
        ],
      },
      { kind: 'item', to: 'attendance/submissions', label: 'Attendance' },
    ])
  })
})
