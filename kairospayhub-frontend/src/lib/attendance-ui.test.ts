import { describe, expect, it } from 'vitest'
import type { AttendanceOccurrenceDetail } from '@/api/attendance'
import {
  formatSubmissionWindow,
  isFutureServiceDate,
  isRollCallEditable,
  nextUpcomingOccurrence,
  pickNearestOccurrence,
  rollCallState,
  selectableOccurrences,
  upcomingRollCallLockMessage,
} from '@/lib/attendance-ui'

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
