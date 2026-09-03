import { describe, expect, it } from 'vitest'
import type { CalendarEvent } from '@/api/events'
import { upcomingCalendarEvents } from '@/lib/calendar-events-ui'

const sampleEvents: CalendarEvent[] = [
  {
    id: '1',
    kind: 'Birthday',
    title: 'Ada',
    detail: 'Turns 30',
    date: '2026-08-09',
    scopeNodeId: null,
    scopeUnitName: null,
    canEdit: false,
  },
  {
    id: '2',
    kind: 'Meeting',
    title: 'Cell meeting',
    detail: 'Roll call',
    date: '2026-08-12',
    scopeNodeId: null,
    scopeUnitName: null,
    canEdit: false,
  },
  {
    id: '3',
    kind: 'Custom',
    title: 'Prayer night',
    detail: null,
    date: '2026-08-25',
    scopeNodeId: 'scope-1',
    scopeUnitName: 'Zion Cell 1',
    canEdit: false,
  },
]

describe('upcomingCalendarEvents', () => {
  it('returns events within the day window from the start date', () => {
    expect(upcomingCalendarEvents(sampleEvents, '2026-08-09', 7).map((event) => event.title)).toEqual([
      'Ada',
      'Cell meeting',
    ])
  })

  it('sorts by date then title', () => {
    const events = upcomingCalendarEvents(sampleEvents, '2026-08-09', 30)
    expect(events.map((event) => event.date)).toEqual(['2026-08-09', '2026-08-12', '2026-08-25'])
  })
})
