import { describe, expect, it } from 'vitest'
import type { AttendanceOccurrenceDetail } from '@/features/attendance/api'
import {
  formatSubmissionWindow,
  approvedUnitsTileLabel,
  buildUnitMetricsGroups,
  DEFAULT_WHO_SHOWED_UP_COLUMN_VISIBILITY,
  groupScopeSubmissions,
  isFutureServiceDate,
  isRollCallEditable,
  nextUpcomingOccurrence,
  pickNearestOccurrence,
  rollCallState,
  selectableOccurrences,
  todayDateKey,
  upcomingRollCallLockMessage,
  weeklyDayOffsetOptions,
  yetToSubmitUnits,
} from '@/features/attendance/lib/attendance-ui'

describe('approvedUnitsTileLabel', () => {
  it('pluralizes Cell and Fellowship labels', () => {
    expect(approvedUnitsTileLabel('Cell')).toBe('Approved Cells')
    expect(approvedUnitsTileLabel('Fellowship')).toBe('Approved Fellowships')
  })

  it('falls back when layer is missing', () => {
    expect(approvedUnitsTileLabel(null)).toBe('Approved units')
    expect(approvedUnitsTileLabel(undefined)).toBe('Approved units')
  })
})

describe('metrics detail helpers', () => {
  it('defaults parent unit column off', () => {
    expect(DEFAULT_WHO_SHOWED_UP_COLUMN_VISIBILITY.parentUnit).toBe(false)
    expect(DEFAULT_WHO_SHOWED_UP_COLUMN_VISIBILITY.name).toBe(true)
  })

  it('groups scope submissions by parent unit', () => {
    const grouped = groupScopeSubmissions(
      [
        {
          id: '1',
          scopeUnitName: 'Cell A',
          parentUnitName: 'Renewers',
          approvalStatus: 'Approved',
          submittedAt: null,
        },
        {
          id: '2',
          scopeUnitName: 'Cell B',
          parentUnitName: 'Renewers',
          approvalStatus: 'PendingApproval',
          submittedAt: null,
        },
        {
          id: '3',
          scopeUnitName: 'Cell C',
          parentUnitName: 'Zion',
          approvalStatus: 'Draft',
          submittedAt: null,
        },
      ],
      'parent',
    )
    expect(grouped).toHaveLength(2)
    expect(grouped[0]?.groupLabel).toBe('Renewers')
    expect(grouped[0]?.rows).toHaveLength(2)
    expect(grouped[1]?.groupLabel).toBe('Zion')
  })

  it('builds unit metrics groups with aggregated counts', () => {
    const groups = buildUnitMetricsGroups([
      {
        id: '1',
        scopeUnitName: 'Cell A',
        parentUnitName: 'Renewers',
        parentLayerName: 'Fellowship',
        approvalStatus: 'Approved',
        submittedAt: null,
        totalPresent: 5,
        membersPresent: 4,
        firstTimersPresent: 1,
        guestsPresent: 1,
      },
      {
        id: '2',
        scopeUnitName: 'Cell B',
        parentUnitName: 'Renewers',
        parentLayerName: 'Fellowship',
        approvalStatus: 'Approved',
        submittedAt: null,
        totalPresent: 3,
        membersPresent: 2,
        firstTimersPresent: 0,
        guestsPresent: 1,
      },
    ])
    expect(groups).toHaveLength(1)
    expect(groups[0]?.groupLabel).toBe('Renewers')
    expect(groups[0]?.parentLayerName).toBe('Fellowship')
    expect(groups[0]?.present).toBe(8)
    expect(groups[0]?.members).toBe(6)
    expect(groups[0]?.firstTimers).toBe(1)
    expect(groups[0]?.guests).toBe(2)
  })

  it('filters yet-to-submit draft units', () => {
    expect(
      yetToSubmitUnits([
        { approvalStatus: 'Draft' },
        { approvalStatus: 'PendingApproval' },
        { approvalStatus: 'Approved' },
      ]),
    ).toEqual([{ approvalStatus: 'Draft' }])
  })
})

describe('formatSubmissionWindow', () => {
  it('formats a readable GMT submission window for Sunday service', () => {
    expect(
      formatSubmissionWindow({
        dayOfWeek: 'Sunday',
        opensDayOffset: 0,
        opensTimeUtc: '14:00:00',
        deadlineDayOffset: 1,
        deadlineTimeUtc: '00:00:00',
      }),
    ).toBe('Opens Sunday 2:00 PM GMT · Closes Monday 12:00 AM GMT')
  })

  it('shows Always open when flagged', () => {
    expect(
      formatSubmissionWindow({
        dayOfWeek: 'Saturday',
        opensDayOffset: 0,
        opensTimeUtc: '21:00:00',
        deadlineDayOffset: 1,
        deadlineTimeUtc: '12:00:00',
        isAlwaysOpen: true,
      }),
    ).toBe('Always open')
  })
})

describe('weeklyDayOffsetOptions', () => {
  it('labels Saturday meeting as same day and next day only', () => {
    expect(weeklyDayOffsetOptions('Saturday')).toEqual([
      { value: 0, label: 'Saturday (same day)' },
      { value: 1, label: 'Sunday (next day)' },
    ])
  })
})

describe('pickNearestOccurrence', () => {
  const now = new Date('2026-08-08T12:00:00Z')

  it('prefers the eligible open occurrence nearest to today', () => {
    const picked = pickNearestOccurrence(
      [
        {
          id: '1',
          meetingDate: '2026-08-03',
          status: 'Open',
          submissionOpensAt: '',
          submissionDeadlineAt: '',
          scopeSubmissionCount: 1,
        },
        {
          id: '2',
          meetingDate: '2026-08-10',
          status: 'Open',
          submissionOpensAt: '',
          submissionDeadlineAt: '',
          scopeSubmissionCount: 1,
        },
      ],
      now,
    )
    expect(picked?.id).toBe('1')
  })

  it('excludes future service dates from selection', () => {
    const rows = selectableOccurrences(
      [
        {
          id: 'future',
          meetingDate: '2026-08-16',
          status: 'Scheduled',
          submissionOpensAt: '',
          submissionDeadlineAt: '',
          scopeSubmissionCount: 1,
        },
      ],
      now,
    )
    expect(rows).toHaveLength(0)
  })
})

describe('rollCallState', () => {
  const baseDetail: AttendanceOccurrenceDetail = {
    id: 'occ-1',
    meetingTypeId: 'type-1',
    meetingTypeTitle: 'Sunday Service',
    meetingDate: '2026-08-03',
    status: 'Open',
    submissionOpensAt: '2026-08-03T14:00:00Z',
    submissionDeadlineAt: '2026-08-04T00:00:00Z',
    scopeSubmissions: [
      {
        id: 'sub-1',
        scopeNodeId: 'cell-1',
        lockStatus: 'NotYetOpen',
        approvalStatus: 'Draft',
        submittedAt: null,
      },
    ],
    entries: [],
  }

  it('blocks future services', () => {
    const state = rollCallState(
      { ...baseDetail, meetingDate: '2026-08-16' },
      'cell-1',
      new Date('2026-08-08T12:00:00Z'),
    )
    expect(state.editable).toBe(false)
    expect(state.reason).toBe('serviceNotHappened')
  })

  it('treats the submission window as editable after it opens', () => {
    const state = rollCallState(baseDetail, 'cell-1', new Date('2026-08-03T15:00:00Z'))
    expect(state.editable).toBe(true)
    expect(isRollCallEditable(baseDetail, 'cell-1', new Date('2026-08-03T15:00:00Z'))).toBe(true)
  })

  it('locks draft roll calls after the submission deadline passes', () => {
    const lockedDraft = {
      ...baseDetail,
      submissionDeadlineAt: '2026-08-03T16:00:00Z',
      scopeSubmissions: [
        {
          ...baseDetail.scopeSubmissions[0],
          lockStatus: 'LockedMissed',
        },
      ],
    }
    const state = rollCallState(lockedDraft, 'cell-1', new Date('2026-08-10T12:00:00Z'))
    expect(state.editable).toBe(false)
    expect(state.reason).toBe('locked')
  })
})

describe('isFutureServiceDate', () => {
  it('compares meeting dates against today', () => {
    const now = new Date('2026-08-08T12:00:00Z')
    expect(isFutureServiceDate('2026-08-16', now)).toBe(true)
    expect(isFutureServiceDate('2026-08-08', now)).toBe(false)
  })

  it('uses church timezone so late Saturday evening is still that Saturday', () => {
    // Saturday 2026-09-05 22:00 America/Toronto == Sunday 2026-09-06 02:00 UTC
    const now = new Date('2026-09-06T02:00:00Z')
    expect(todayDateKey(now, 'America/Toronto')).toBe('2026-09-05')
    expect(isFutureServiceDate('2026-09-05', now, 'America/Toronto')).toBe(false)
    expect(isFutureServiceDate('2026-09-12', now, 'America/Toronto')).toBe(true)
  })
})

describe('nextUpcomingOccurrence', () => {
  const now = new Date('2026-08-15T12:00:00Z')

  it('returns the earliest future service', () => {
    const next = nextUpcomingOccurrence(
      [
        {
          id: 'past',
          meetingDate: '2026-08-09',
          status: 'Open',
          submissionOpensAt: '',
          submissionDeadlineAt: '',
          scopeSubmissionCount: 1,
        },
        {
          id: 'next',
          meetingDate: '2026-08-16',
          status: 'Scheduled',
          submissionOpensAt: '2026-08-16T14:00:00Z',
          submissionDeadlineAt: '2026-08-17T00:00:00Z',
          scopeSubmissionCount: 1,
        },
        {
          id: 'later',
          meetingDate: '2026-08-23',
          status: 'Scheduled',
          submissionOpensAt: '2026-08-23T14:00:00Z',
          submissionDeadlineAt: '2026-08-24T00:00:00Z',
          scopeSubmissionCount: 1,
        },
      ],
      now,
    )
    expect(next?.id).toBe('next')
  })
})

describe('upcomingRollCallLockMessage', () => {
  it('includes when roll call opens', () => {
    const message = upcomingRollCallLockMessage(
      {
        id: 'next',
        meetingDate: '2026-08-16',
        status: 'Scheduled',
        submissionOpensAt: '2026-08-16T14:00:00Z',
        submissionDeadlineAt: '2026-08-17T00:00:00Z',
        scopeSubmissionCount: 1,
      },
      new Date('2026-08-15T12:00:00Z'),
    )
    expect(message.title).toContain('roll call locked')
    expect(message.description).toContain('Roll call opens')
  })
})
