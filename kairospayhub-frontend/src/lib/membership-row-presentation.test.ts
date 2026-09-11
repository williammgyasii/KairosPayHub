import { describe, expect, it } from 'vitest'
import {
  membershipNewBadgeClass,
  membershipYouBadgeClass,
  membershipRowTone,
  membershipRowToneClass,
  sortMembershipRows,
} from '@/lib/membership-row-presentation'

const now = new Date('2026-09-11T12:00:00.000Z')

describe('membershipRowTone', () => {
  it('marks pending joiners pending', () => {
    expect(membershipRowTone({ rosterStatus: 'Pending', createdAt: now.toISOString(), now })).toBe(
      'pending',
    )
  })

  it('marks a recently accepted member new', () => {
    expect(
      membershipRowTone({
        rosterStatus: 'Active',
        createdAt: '2026-09-08T12:00:00.000Z',
        now,
      }),
    ).toBe('new')
  })

  it('leaves older members default', () => {
    expect(
      membershipRowTone({
        rosterStatus: 'Active',
        createdAt: '2026-01-01T12:00:00.000Z',
        now,
      }),
    ).toBe('default')
  })

  it('labels the current member You even when they would be New', () => {
    expect(
      membershipRowTone({
        rosterStatus: 'Active',
        createdAt: '2026-09-08T12:00:00.000Z',
        now,
        memberId: 'me',
        currentMemberId: 'me',
      }),
    ).toBe('you')
  })

  it('labels an older current member You', () => {
    expect(
      membershipRowTone({
        rosterStatus: 'Active',
        createdAt: '2026-01-01T12:00:00.000Z',
        now,
        memberId: 'me',
        currentMemberId: 'me',
      }),
    ).toBe('you')
  })

  it('still marks a recent other member New', () => {
    expect(
      membershipRowTone({
        rosterStatus: 'Active',
        createdAt: '2026-09-08T12:00:00.000Z',
        now,
        memberId: 'other',
        currentMemberId: 'me',
      }),
    ).toBe('new')
  })

  it('keeps a pending current member Pending', () => {
    expect(
      membershipRowTone({
        rosterStatus: 'Pending',
        createdAt: now.toISOString(),
        now,
        memberId: 'me',
        currentMemberId: 'me',
      }),
    ).toBe('pending')
  })
})

describe('membershipRowToneClass', () => {
  it('only tints pending rows, not new members', () => {
    expect(membershipRowToneClass('pending')).toContain('amber')
    expect(membershipRowToneClass('new')).toBe('')
    expect(membershipRowToneClass('you')).toBe('')
    expect(membershipRowToneClass('default')).toBe('')
  })
})

describe('membershipNewBadgeClass', () => {
  it('uses a green badge with white text', () => {
    expect(membershipNewBadgeClass()).toContain('emerald-600')
    expect(membershipNewBadgeClass()).toContain('text-white')
  })
})

describe('membershipYouBadgeClass', () => {
  it('uses a sky bubble that is not fully pill-round', () => {
    expect(membershipYouBadgeClass()).toContain('sky-')
    expect(membershipYouBadgeClass()).toContain('rounded-md')
    expect(membershipYouBadgeClass()).not.toContain('emerald')
  })
})

describe('sortMembershipRows', () => {
  it('puts pending then new above the rest', () => {
    const sorted = sortMembershipRows(
      [
        { member: 'Zoe', rosterStatus: 'Active', createdAt: '2026-01-01T00:00:00.000Z' },
        { member: 'Ada', rosterStatus: 'Active', createdAt: '2026-09-10T00:00:00.000Z' },
        { member: 'Bo', rosterStatus: 'Pending', createdAt: '2026-09-11T00:00:00.000Z' },
      ],
      now,
    )
    expect(sorted.map((row) => row.member)).toEqual(['Bo', 'Ada', 'Zoe'])
  })

  it('does not pin the current member above other New rows', () => {
    const sorted = sortMembershipRows(
      [
        {
          id: 'me',
          member: 'Me',
          rosterStatus: 'Active',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
        {
          id: 'ada',
          member: 'Ada',
          rosterStatus: 'Active',
          createdAt: '2026-09-10T00:00:00.000Z',
        },
        {
          id: 'bo',
          member: 'Bo',
          rosterStatus: 'Pending',
          createdAt: '2026-09-11T00:00:00.000Z',
        },
      ],
      now,
    )
    expect(sorted.map((row) => row.member)).toEqual(['Bo', 'Ada', 'Me'])
  })
})
