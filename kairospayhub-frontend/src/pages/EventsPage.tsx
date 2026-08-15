import { endOfMonth, format, startOfMonth } from 'date-fns'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  createCalendarEvent,
  deleteCalendarEvent,
  getCalendarFeed,
  type CalendarEvent,
} from '@/api/calendar'
import { canManageChurch } from '@/api/me'
import { useApi } from '@/api/useApi'
import type { DashboardOutletContext } from '@/components/layout/dashboard-layout'
import { EventsCalendarGrid } from '@/components/events/events-calendar-grid'
import { EventsDaySheet } from '@/components/events/events-day-sheet'
import { defaultEventScopeNodeId, eventsForDay } from '@/lib/calendar-events-ui'
import { formatApiError } from '@/lib/structure-tree'
import { Spinner } from '@/components/ui/spinner'

export function EventsPage() {
  const { me } = useOutletContext<DashboardOutletContext>()
  const api = useApi()
  const scopeUnitName = me.onboarded
    ? me.scopeUnitName ?? me.rollCallScopes?.[0]?.scopeUnitName ?? 'your scope'
    : 'your scope'

  const [month, setMonth] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const range = useMemo(
    () => ({
      from: format(startOfMonth(month), 'yyyy-MM-dd'),
      to: format(endOfMonth(month), 'yyyy-MM-dd'),
    }),
    [month],
  )

  const loadFeed = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const feed = await getCalendarFeed(api, range.from, range.to)
      setEvents(feed.items)
    } catch (err) {
      setError(formatApiError(err))
      setEvents([])
    } finally {
      setLoading(false)
    }
  }, [api, range.from, range.to])

  useEffect(() => {
    void loadFeed()
  }, [loadFeed])

  const selectedIso = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null
  const dayEvents = useMemo(
    () => (selectedIso ? eventsForDay(events, selectedIso) : []),
    [events, selectedIso],
  )

  const canCreate = me.onboarded
  const createScopeNodeId = defaultEventScopeNodeId(me)

  async function handleCreate(input: { title: string; description: string }) {
    if (!selectedDate) return
    setBusy(true)
    setError(null)
    try {
      await createCalendarEvent(api, {
        title: input.title,
        description: input.description || null,
        eventDate: format(selectedDate, 'yyyy-MM-dd'),
        scopeNodeId: canManageChurch(me.role) ? null : createScopeNodeId,
      })
      await loadFeed()
    } catch (err) {
      setError(formatApiError(err))
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(event: CalendarEvent) {
    if (event.kind !== 'Custom') return
    setBusy(true)
    setError(null)
    try {
      await deleteCalendarEvent(api, event.id)
      await loadFeed()
    } catch (err) {
      setError(formatApiError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="-mx-4 -my-5 flex h-[calc(100dvh-3.5rem)] flex-col gap-2 overflow-hidden px-4 sm:-mx-6 sm:-my-6 sm:gap-3 sm:px-6">
      <div className="shrink-0">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Events</h1>
        <p className="text-xs text-muted-foreground sm:text-sm">
          Birthdays, meetings, and reminders for {scopeUnitName}. Click a day for details.
        </p>
      </div>

      {error && (
        <p className="shrink-0 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {loading && events.length === 0 ? (
        <Spinner label="Loading calendar…" />
      ) : (
        <div className="min-h-0 flex-1">
          <EventsCalendarGrid
            month={month}
            onMonthChange={setMonth}
            events={events}
            selectedDate={selectedDate}
            onSelectDate={(date) => {
              setSelectedDate(date)
              setSheetOpen(true)
            }}
          />
        </div>
      )}

      <EventsDaySheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        date={selectedDate}
        events={dayEvents}
        canCreate={canCreate}
        createBusy={busy}
        onCreate={handleCreate}
        onDelete={handleDelete}
      />
    </div>
  )
}
