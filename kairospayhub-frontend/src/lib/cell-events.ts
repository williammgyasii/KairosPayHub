import { ageFromDateOfBirth } from '@/lib/member-age'

export type CellEventKind = 'birthday' | 'meeting'

export type CellEvent = {
  id: string
  kind: CellEventKind
  title: string
  detail?: string
  date: string
  dateOfBirth?: string
  memberId?: string
  occurrenceId?: string
  meetingTypeTitle?: string
}

type MemberBirthdaySource = {
  id: string
  name: string
  dateOfBirth: string | null
}

type MeetingOccurrenceSource = {
  id: string
  meetingTypeTitle: string
  meetingDate: string
}

function parseIsoDate(value: string): { year: number; month: number; day: number } | null {
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return null
  return { year, month, day }
}

function isoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function birthdayEventsForMonth(
  members: MemberBirthdaySource[],
  year: number,
  month: number,
): CellEvent[] {
  const events: CellEvent[] = []

  for (const member of members) {
    if (!member.dateOfBirth?.trim()) continue
    const dob = parseIsoDate(member.dateOfBirth)
    if (!dob || dob.month !== month) continue

    const eventDate = isoDate(year, dob.month, dob.day)
    const turningAge = ageFromDateOfBirth(
      member.dateOfBirth,
      new Date(year, dob.month - 1, dob.day),
    )

    events.push({
      id: `birthday-${member.id}-${eventDate}`,
      kind: 'birthday',
      title: member.name,
      detail: turningAge != null ? `Turns ${turningAge}` : 'Birthday',
      date: eventDate,
      dateOfBirth: member.dateOfBirth,
      memberId: member.id,
    })
  }

  return events.sort((a, b) => a.title.localeCompare(b.title))
}

export function meetingEventsForMonth(
  occurrences: MeetingOccurrenceSource[],
  year: number,
  month: number,
): CellEvent[] {
  return occurrences
    .flatMap((occurrence) => {
      const meetingDate = parseIsoDate(occurrence.meetingDate)
      if (!meetingDate || meetingDate.year !== year || meetingDate.month !== month) return []

      return [
        {
          id: `meeting-${occurrence.id}`,
          kind: 'meeting' as const,
          title: occurrence.meetingTypeTitle,
          detail: 'Roll call',
          date: occurrence.meetingDate,
          occurrenceId: occurrence.id,
          meetingTypeTitle: occurrence.meetingTypeTitle,
        },
      ]
    })
    .sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title))
}

export function mergeCellEvents(...groups: CellEvent[][]): CellEvent[] {
  return groups
    .flat()
    .sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title))
}

export function eventsOnDate(events: CellEvent[], date: string): CellEvent[] {
  return events.filter((event) => event.date === date)
}

export function upcomingEvents(events: CellEvent[], fromDate: string, dayCount: number): CellEvent[] {
  const from = parseIsoDate(fromDate)
  if (!from) return []

  const start = new Date(from.year, from.month - 1, from.day)
  const end = new Date(start)
  end.setDate(end.getDate() + dayCount)

  return events.filter((event) => {
    const parts = parseIsoDate(event.date)
    if (!parts) return false
    const date = new Date(parts.year, parts.month - 1, parts.day)
    return date >= start && date <= end
  })
}

export function datesWithEvents(events: CellEvent[]): string[] {
  return [...new Set(events.map((event) => event.date))]
}

export function birthdayEventsAhead(
  members: MemberBirthdaySource[],
  fromDate: string,
  dayCount: number,
): CellEvent[] {
  const from = parseIsoDate(fromDate)
  if (!from) return []

  const start = new Date(from.year, from.month - 1, from.day)
  const end = new Date(start)
  end.setDate(end.getDate() + dayCount)

  const events: CellEvent[] = []
  const years = [from.year, from.year + 1]

  for (const member of members) {
    if (!member.dateOfBirth?.trim()) continue
    const dob = parseIsoDate(member.dateOfBirth)
    if (!dob) continue

    for (const year of years) {
      const eventDate = isoDate(year, dob.month, dob.day)
      const parts = parseIsoDate(eventDate)
      if (!parts) continue

      const date = new Date(parts.year, parts.month - 1, parts.day)
      if (date < start || date > end) continue

      const turningAge = ageFromDateOfBirth(member.dateOfBirth, date)
      events.push({
        id: `birthday-${member.id}-${eventDate}`,
        kind: 'birthday',
        title: member.name,
        detail: turningAge != null ? `Turns ${turningAge}` : 'Birthday',
        date: eventDate,
        dateOfBirth: member.dateOfBirth,
        memberId: member.id,
      })
    }
  }

  return events.sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title))
}

export function meetingEventsAhead(
  occurrences: MeetingOccurrenceSource[],
  fromDate: string,
  dayCount: number,
): CellEvent[] {
  const from = parseIsoDate(fromDate)
  if (!from) return []

  const start = new Date(from.year, from.month - 1, from.day)
  const end = new Date(start)
  end.setDate(end.getDate() + dayCount)

  return occurrences
    .flatMap((occurrence) => {
      const meetingDate = parseIsoDate(occurrence.meetingDate)
      if (!meetingDate) return []

      const date = new Date(meetingDate.year, meetingDate.month - 1, meetingDate.day)
      if (date < start || date > end) return []

      return [
        {
          id: `meeting-${occurrence.id}`,
          kind: 'meeting' as const,
          title: occurrence.meetingTypeTitle,
          detail: 'Roll call',
          date: occurrence.meetingDate,
          occurrenceId: occurrence.id,
          meetingTypeTitle: occurrence.meetingTypeTitle,
        },
      ]
    })
    .sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title))
}
