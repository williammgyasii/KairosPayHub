import type { ApiClient } from './client'

export type CalendarEventKind = 'Birthday' | 'Meeting' | 'Custom'

export type CalendarEvent = {
  id: string
  kind: CalendarEventKind
  title: string
  detail: string | null
  date: string
  scopeNodeId: string | null
  scopeUnitName: string | null
  canEdit: boolean
}

export type CalendarFeedResponse = {
  items: CalendarEvent[]
}

export type CreateCalendarEventInput = {
  title: string
  description?: string | null
  eventDate: string
  scopeNodeId?: string | null
}

export function getCalendarFeed(api: ApiClient, from: string, to: string) {
  const params = new URLSearchParams({ from, to })
  return api.get<CalendarFeedResponse>(`/api/calendar/feed?${params}`)
}

export function createCalendarEvent(api: ApiClient, input: CreateCalendarEventInput) {
  return api.post<CalendarEvent>('/api/calendar/events', input)
}

export function deleteCalendarEvent(api: ApiClient, eventId: string) {
  return api.delete<{ ok: boolean }>(`/api/calendar/events/${eventId}`)
}
