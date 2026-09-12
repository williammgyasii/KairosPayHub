import { endOfMonth, format, startOfMonth } from 'date-fns'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  createCalendarEvent,
  deleteCalendarEvent,
  getCalendarFeed,
  type CalendarEvent,
} from '@/features/events/api'
import { canManageChurch } from '@/api/auth'
import { useApi } from '@/shared/api'
import type { DashboardOutletContext } from '@/shared/layout/dashboard-layout'
import { EventsCalendarGrid } from '@/features/events/components/events-calendar-grid'
import { EventsDaySheet } from '@/features/events/components/events-day-sheet'
import { defaultEventScopeNodeId, eventsForDay } from '@/features/events/lib/calendar-events-ui'
import { formatApiError } from '@/shared/lib/structure-tree'
import { useAppDispatch } from '@/store/hooks'
import { invalidateNotificationTags } from '@/store/notificationsApi'
import { Button } from '@/shared/ui/button'
import { Spinner } from '@/shared/ui/spinner'

export function EventsPage() {
  const { me } = useOutletContext<DashboardOutletContext>()
  const api = useApi()
  const dispatch = useAppDispatch()
  const scopeUnitName = me.onboarded
    ? me.scopeUnitName ?? me.rollCallScopes?.[0]?.scopeUnitName ?? 'your scope'
    : 'your scope'

  const [month, setMonth] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [startWithAddForm, setStartWithAddForm] = useState(false)
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

  function openDaySheet(date: Date, withAddForm = false) {
    setSelectedDate(date)
    setStartWithAddForm(withAddForm)
    setSheetOpen(true)
  }

  async function handleCreate(input: {
    title: string
    description: string
    notifyLeadersUp: boolean
    notifyLeadersDown: boolean
  }) {
    const eventDate = selectedDate ?? new Date()
    setBusy(true)
    setError(null)
    try {
      await createCalendarEvent(api, {
        title: input.title,
        description: input.description || null,
        eventDate: format(eventDate, 'yyyy-MM-dd'),
        scopeNodeId: canManageChurch(me.role) ? null : createScopeNodeId,
        notifyLeadersUp: input.notifyLeadersUp,
        notifyLeadersDown: input.notifyLeadersDown,
      })
      await loadFeed()
      if (input.notifyLeadersUp || input.notifyLeadersDown) {
        dispatch(invalidateNotificationTags())
      }
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
    <div className="-mx-4 -my-5 flex h-[calc(100dvh-8.5rem-env(safe-area-inset-bottom))] min-h-0 flex-1 flex-col gap-1.5 overflow-hidden px-3 lg:h-[calc(100dvh-4.5rem)] sm:-mx-6 sm:-my-6 sm:gap-2 sm:px-6">
      <div className="flex shrink-0 items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold tracking-tight sm:text-xl">Events</h1>
          <p className="text-[11px] text-muted-foreground sm:text-xs">
            Birthdays, meetings, and reminders for {scopeUnitName}.
          </p>
        </div>
        {canCreate ? (
          <Button
            type="button"
            size="sm"
            className="shrink-0"
            onClick={() => openDaySheet(selectedDate ?? new Date(), true)}
          >
            New event
          </Button>
        ) : null}
      </div>

      {error && (
        <p className="shrink-0 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {loading && events.length === 0 ? (
        <Spinner label="Loading calendar…" />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <EventsCalendarGrid
            month={month}
            onMonthChange={setMonth}
            events={events}
            selectedDate={selectedDate}
            onSelectDate={(date) => openDaySheet(date)}
          />
        </div>
      )}

      <EventsDaySheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        date={selectedDate}
        events={dayEvents}
        me={me}
        canCreate={canCreate}
        createBusy={busy}
        startWithAddForm={startWithAddForm}
        onCreate={handleCreate}
        onDelete={handleDelete}
      />
    </div>
  )
}
