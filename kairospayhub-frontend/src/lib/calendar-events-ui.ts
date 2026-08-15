import { canManageChurch, isCellLeader, isScopedLeader, type Me } from '@/api/me'
import type { CalendarEvent, CalendarEventKind } from '@/api/calendar'

export function canAccessEvents(me: Me): boolean {
  if (!me.onboarded) return false
  return canManageChurch(me.role) || isScopedLeader(me.role) || isCellLeader(me.role)
}

export function defaultEventScopeNodeId(me: Me): string | null {
  if (!me.onboarded) return null
  if (isCellLeader(me.role)) {
    return me.rollCallScopes?.[0]?.scopeNodeId ?? me.scopeNodeId ?? null
  }
  return me.scopeNodeId ?? null
}

export function eventKindLabel(kind: CalendarEventKind): string {
  switch (kind) {
    case 'Birthday':
      return 'Birthday'
    case 'Meeting':
      return 'Meeting'
    default:
      return 'Event'
  }
}

export function eventKindTone(kind: CalendarEventKind): string {
  switch (kind) {
    case 'Birthday':
      return 'border-rose-200/80 bg-rose-500/10 text-rose-900'
    case 'Meeting':
      return 'border-sky-200/80 bg-sky-500/10 text-sky-900'
    default:
      return 'border-violet-200/80 bg-violet-500/10 text-violet-900'
  }
}

export function eventsForDay(events: CalendarEvent[], date: string): CalendarEvent[] {
  return events.filter((event) => event.date === date)
}

function parseIsoDate(value: string): { year: number; month: number; day: number } | null {
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return null
  return { year, month, day }
}

export function upcomingCalendarEvents(
  events: CalendarEvent[],
  fromDate: string,
  dayCount: number,
): CalendarEvent[] {
  const from = parseIsoDate(fromDate)
  if (!from) return []

  const start = new Date(from.year, from.month - 1, from.day)
  const end = new Date(start)
  end.setDate(end.getDate() + dayCount)

  return events
    .filter((event) => {
      const parts = parseIsoDate(event.date)
      if (!parts) return false
      const date = new Date(parts.year, parts.month - 1, parts.day)
      return date >= start && date <= end
    })
    .sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title))
}
