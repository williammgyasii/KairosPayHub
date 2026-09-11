import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Cake, CalendarDays, ChevronLeft, ChevronRight, ClipboardCheck, Star } from 'lucide-react'
import type { CalendarEvent, CalendarEventKind } from '@/features/events/api'
import { eventKindLabel, upcomingCalendarEvents } from '@/features/events/lib/calendar-events-ui'
import { useGetCalendarFeedQuery } from '@/features/events/api/calendarApi'
import { formatRtkQueryError } from '@/store/baseQuery'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/lib/utils'

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const UPCOMING_DAYS = 14

function kindIcon(kind: CalendarEventKind) {
  switch (kind) {
    case 'Birthday':
      return Cake
    case 'Meeting':
      return ClipboardCheck
    default:
      return Star
  }
}

function kindDot(kind: CalendarEventKind): string {
  switch (kind) {
    case 'Birthday':
      return 'bg-rose-500'
    case 'Meeting':
      return 'bg-sky-500'
    default:
      return 'bg-violet-500'
  }
}

function groupEventsByDate(events: CalendarEvent[]): Map<string, CalendarEvent[]> {
  const map = new Map<string, CalendarEvent[]>()
  for (const event of events) {
    const bucket = map.get(event.date) ?? []
    bucket.push(event)
    map.set(event.date, bucket)
  }
  return map
}

export function DashboardCalendarPanel({ scopeLabel }: { scopeLabel?: string }) {
  const [month, setMonth] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState(() => new Date())

  const monthStart = format(startOfMonth(month), 'yyyy-MM-dd')
  const feedEnd = format(addDays(startOfMonth(month), 60), 'yyyy-MM-dd')

  const { data, isLoading, error } = useGetCalendarFeedQuery({
    from: monthStart,
    to: feedEnd,
  })

  const events = data?.items ?? []
  const eventsByDate = useMemo(() => groupEventsByDate(events), [events])

  const days = useMemo(() => {
    const start = startOfMonth(month)
    const end = endOfMonth(month)
    return eachDayOfInterval({
      start: startOfWeek(start),
      end: endOfWeek(end),
    })
  }, [month])

  const upcoming = useMemo(
    () => upcomingCalendarEvents(events, format(new Date(), 'yyyy-MM-dd'), UPCOMING_DAYS),
    [events],
  )

  return (
    <section className="overflow-hidden rounded-xl border border-border/60 bg-background">
      <div className="flex items-center justify-between gap-2 border-b border-border/60 px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <CalendarDays className="size-4 shrink-0 text-primary" />
          <h2 className="truncate text-sm font-semibold">{format(month, 'MMMM yyyy')}</h2>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => setMonth((current) => addMonths(current, -1))}
            aria-label="Previous month"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => {
              const today = new Date()
              setMonth(today)
              setSelectedDate(today)
            }}
          >
            Today
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => setMonth((current) => addMonths(current, 1))}
            aria-label="Next month"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div className="px-3 pt-2">
        <div className="grid grid-cols-7 text-center text-[10px] font-medium text-muted-foreground">
          {WEEKDAY_LABELS.map((label, index) => (
            <div key={`${label}-${index}`} className="py-1">
              {label}
            </div>
          ))}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-7 gap-0.5 pb-3">
            {Array.from({ length: 35 }).map((_, index) => (
              <div key={index} className="aspect-square animate-pulse rounded-md bg-muted/40" />
            ))}
          </div>
        ) : error ? (
          <p className="px-1 pb-3 text-xs text-destructive">{formatRtkQueryError(error)}</p>
        ) : (
          <div className="grid grid-cols-7 gap-0.5 pb-3">
            {days.map((day) => {
              const iso = format(day, 'yyyy-MM-dd')
              const dayEvents = eventsByDate.get(iso) ?? []
              const inMonth = isSameMonth(day, month)
              const selected = isSameDay(day, selectedDate)
              const today = isToday(day)

              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => setSelectedDate(day)}
                  className={cn(
                    'flex aspect-square flex-col items-center justify-center rounded-md text-xs transition-colors',
                    !inMonth && 'text-muted-foreground/50',
                    inMonth && !selected && !today && 'hover:bg-muted/40',
                    selected && 'bg-primary text-primary-foreground',
                    today && !selected && dayEvents.length > 0 && 'bg-primary/10 ring-1 ring-inset ring-primary/50',
                    today && !selected && dayEvents.length === 0 && 'ring-1 ring-inset ring-primary/40',
                  )}
                >
                  <span className={cn('font-medium tabular-nums', today && !selected && 'text-primary')}>
                    {format(day, 'd')}
                  </span>
                  {dayEvents.length > 0 ? (
                    <span className="mt-0.5 flex gap-0.5">
                      {dayEvents.slice(0, 3).map((event) => (
                        <span
                          key={event.id}
                          className={cn(
                            'size-1 rounded-full',
                            selected ? 'bg-primary-foreground/80' : kindDot(event.kind),
                          )}
                        />
                      ))}
                    </span>
                  ) : (
                    <span className="mt-0.5 size-1" aria-hidden />
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div className="border-t border-border/60 px-3 py-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground">Upcoming events</p>
            <p className="text-[11px] text-muted-foreground">
              {scopeLabel ? `${scopeLabel} · next ${UPCOMING_DAYS} days` : `Next ${UPCOMING_DAYS} days`}
            </p>
          </div>
          <Link to="/events" className="shrink-0 text-xs font-medium text-primary hover:underline">
            Full calendar
          </Link>
        </div>

        {upcoming.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nothing coming up in the next {UPCOMING_DAYS} days.</p>
        ) : (
          <ul
            className={cn(
              'max-h-48 space-y-2 overflow-y-auto pr-1',
              '[scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5',
              '[&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border',
            )}
          >
            {upcoming.map((event) => {
              const Icon = kindIcon(event.kind)
              const eventDay = new Date(`${event.date}T12:00:00`)
              const isEventToday = isToday(eventDay)
              const eventDate = isEventToday ? 'Today' : format(eventDay, 'MMM d')
              return (
                <li key={event.id}>
                  <Link
                    to="/events"
                    className={cn(
                      'flex items-start gap-2 rounded-lg px-2 py-1.5 transition-colors',
                      isEventToday
                        ? 'border border-primary/25 bg-primary/5 hover:bg-primary/10'
                        : 'hover:bg-muted/30',
                    )}
                  >
                    <span
                      className={cn(
                        'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md',
                        isEventToday ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground',
                      )}
                    >
                      <Icon className="size-3" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p
                          className={cn(
                            'truncate text-xs font-medium',
                            isEventToday && 'text-primary',
                          )}
                        >
                          {event.title}
                        </p>
                        {isEventToday ? (
                          <span className="shrink-0 rounded bg-primary px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-primary-foreground">
                            Today
                          </span>
                        ) : null}
                      </div>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {eventDate} · {eventKindLabel(event.kind)}
                        {event.detail ? ` · ${event.detail}` : ''}
                      </p>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}
