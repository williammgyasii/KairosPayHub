import { describe, expect, it } from 'vitest'
import {
  birthdayEventsForMonth,
  eventsOnDate,
  meetingEventsForMonth,
  mergeCellEvents,
  upcomingEvents,
} from '@/lib/cell-events'

describe('birthdayEventsForMonth', () => {
  it('maps members with DOB in the month', () => {
    const events = birthdayEventsForMonth(
      [
        { id: 'm1', name: 'Ada', dateOfBirth: '1995-03-15' },
        { id: 'm2', name: 'Ben', dateOfBirth: '1990-08-09' },
      ],
      2026,
      3,
    )

    expect(events).toHaveLength(1)
    expect(events[0]?.title).toBe('Ada')
    expect(events[0]?.date).toBe('2026-03-15')
    expect(events[0]?.detail).toBe('Turns 31')
  })
})

describe('meetingEventsForMonth', () => {
  it('includes occurrences in the month', () => {
    const events = meetingEventsForMonth(
      [
        { id: 'o1', meetingTypeTitle: 'Sunday service', meetingDate: '2026-08-09' },
        { id: 'o2', meetingTypeTitle: 'Midweek', meetingDate: '2026-09-01' },
      ],
      2026,
      8,
    )

    expect(events).toHaveLength(1)
    expect(events[0]?.title).toBe('Sunday service')
  })
})

describe('mergeCellEvents', () => {
  it('sorts birthdays and meetings by date', () => {
    const merged = mergeCellEvents(
      birthdayEventsForMonth([{ id: 'm1', name: 'Ada', dateOfBirth: '1995-08-20' }], 2026, 8),
      meetingEventsForMonth(
        [{ id: 'o1', meetingTypeTitle: 'Cell meeting', meetingDate: '2026-08-09' }],
        2026,
        8,
      ),
    )

    expect(merged.map((event) => event.kind)).toEqual(['meeting', 'birthday'])
  })
})

describe('eventsOnDate', () => {
  it('filters to a single day', () => {
    const events = mergeCellEvents(
      birthdayEventsForMonth([{ id: 'm1', name: 'Ada', dateOfBirth: '1995-08-09' }], 2026, 8),
      meetingEventsForMonth(
        [{ id: 'o1', meetingTypeTitle: 'Cell meeting', meetingDate: '2026-08-09' }],
        2026,
        8,
      ),
    )

    expect(eventsOnDate(events, '2026-08-09')).toHaveLength(2)
  })
})

describe('upcomingEvents', () => {
  it('returns events within the window', () => {
    const events = mergeCellEvents(
      birthdayEventsForMonth(
        [
          { id: 'm1', name: 'Ada', dateOfBirth: '1995-08-09' },
          { id: 'm2', name: 'Ben', dateOfBirth: '1990-08-20' },
        ],
        2026,
        8,
      ),
      meetingEventsForMonth(
        [{ id: 'o1', meetingTypeTitle: 'Cell meeting', meetingDate: '2026-08-15' }],
        2026,
        8,
      ),
    )

    expect(upcomingEvents(events, '2026-08-09', 7).map((event) => event.title)).toEqual([
      'Ada',
      'Cell meeting',
    ])
  })
})
