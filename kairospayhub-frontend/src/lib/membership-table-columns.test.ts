import { describe, expect, it } from 'vitest'
import {
  MEMBERSHIP_ALWAYS_VISIBLE_COLUMN_IDS,
  MEMBERSHIP_PROFILE_COLUMN_LABELS,
  defaultMembershipColumnVisibility,
  mergeMembershipColumnVisibility,
  membershipToggleableColumnIds,
  structureMembershipColumnId,
} from '@/lib/membership-table-columns'

describe('membership-table-columns', () => {
  it('defaults: pastoral glance on, deep profile off; name always on', () => {
    const visibility = defaultMembershipColumnVisibility([
      { id: 'cell', displayName: 'Cell' },
      { id: 'fel', displayName: 'Fellowship' },
    ])

    expect(visibility.member).toBe(true)
    expect(visibility.email).toBe(true)
    expect(visibility.phone).toBe(true)
    expect(visibility.role).toBe(true)
    expect(visibility.responsiveness).toBe(true)
    expect(visibility[structureMembershipColumnId('cell')]).toBe(true)
    expect(visibility[structureMembershipColumnId('fel')]).toBe(true)

    expect(visibility.age).toBe(false)
    expect(visibility.dateOfBirth).toBe(false)
    expect(visibility.residence).toBe(false)
    expect(visibility.state).toBe(false)
    expect(visibility.occupationStatus).toBe(false)
    expect(visibility.schoolOrWorkplace).toBe(false)
    expect(visibility.workplace).toBe(false)
  })

  it('lists every stored profile field as toggleable with a label', () => {
    const ids = membershipToggleableColumnIds([
      { id: 'cell', displayName: 'Cell' },
    ])
    expect(ids).toContain('state')
    expect(ids).toContain('dateOfBirth')
    expect(ids).toContain('workplace')
    expect(ids).toContain(structureMembershipColumnId('cell'))
    expect(ids).not.toContain('member')
    expect(MEMBERSHIP_ALWAYS_VISIBLE_COLUMN_IDS).toContain('member')
    expect(MEMBERSHIP_PROFILE_COLUMN_LABELS.state).toBe('State')
  })

  it('merge keeps name on even if caller tries to hide it', () => {
    const merged = mergeMembershipColumnVisibility(
      defaultMembershipColumnVisibility([{ id: 'cell', displayName: 'Cell' }]),
      { member: false, state: true, email: false },
    )
    expect(merged.member).toBe(true)
    expect(merged.state).toBe(true)
    expect(merged.email).toBe(false)
  })
})
