import { addDays, format, isToday, parseISO } from 'date-fns'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Cake, CalendarDays, ChevronRight, ClipboardCheck, Star } from 'lucide-react'
import {
  eventKindLabel,
  upcomingCalendarEvents,
} from '@/lib/calendar-events-ui'
import { useGetCalendarFeedQuery } from '@/store/calendarApi'
import { formatRtkQueryError } from '@/store/baseQuery'
import type { CalendarEventKind } from '@/api/events'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const UPCOMING_DAYS = 14
const DISPLAY_LIMIT = 8

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

function kindAccent(kind: CalendarEventKind): string {
  switch (kind) {
    case 'Birthday':
      return 'border-l-rose-500 bg-rose-500/5 hover:bg-rose-500/10'
    case 'Meeting':
      return 'border-l-sky-500 bg-sky-500/5 hover:bg-sky-500/10'
    default:
      return 'border-l-violet-500 bg-violet-500/5 hover:bg-violet-500/10'
  }
}

function kindBadge(kind: CalendarEventKind): string {
  switch (kind) {
    case 'Birthday':
      return 'bg-rose-500/15 text-rose-900'
    case 'Meeting':
      return 'bg-sky-500/15 text-sky-900'
    default:
      return 'bg-violet-500/15 text-violet-900'
  }
}

export function UpcomingEventsCard() {
  const fromDate = format(new Date(), 'yyyy-MM-dd')
  const toDate = format(addDays(new Date(), UPCOMING_DAYS), 'yyyy-MM-dd')
  const { data, isLoading, error } = useGetCalendarFeedQuery({ from: fromDate, to: toDate })

  const upcoming = useMemo(
    () => upcomingCalendarEvents(data?.items ?? [], fromDate, UPCOMING_DAYS).slice(0, DISPLAY_LIMIT),
    [data?.items, fromDate],
  )

  return (
    <section className="animate-fade-up overflow-hidden rounded-xl border border-border/60 bg-background">
      <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <CalendarDays className="size-4 text-primary" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold tracking-tight">Upcoming events</h2>
            <p className="truncate text-xs text-muted-foreground">Next {UPCOMING_DAYS} days</p>
          </div>
        </div>
        <Button asChild size="sm" variant="ghost" className="shrink-0 gap-1 text-muted-foreground">
          <Link to="/events">
            Calendar
            <ChevronRight className="size-3.5" />
          </Link>
        </Button>
      </div>

      <div className="relative px-4 py-4 sm:px-5">
        {isLoading ? (
          <div className="flex gap-3 overflow-hidden">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="h-[4.5rem] w-56 shrink-0 animate-pulse rounded-xl border border-border/40 bg-muted/30"
              />
            ))}
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">{formatRtkQueryError(error)}</p>
        ) : upcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing scheduled in the next {UPCOMING_DAYS} days.
          </p>
        ) : (
          <>
            <div
              className={cn(
                'flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1',
                '[scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5',
                '[&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border',
              )}
            >
              {upcoming.map((event, index) => {
                const date = parseISO(`${event.date}T12:00:00`)
                const today = isToday(date)
                const Icon = kindIcon(event.kind)

                return (
                  <Link
                    key={event.id}
                    to="/events"
                    style={{ animationDelay: `${index * 70}ms` }}
                    className={cn(
                      'group animate-slide-in-right flex w-[17rem] shrink-0 snap-start overflow-hidden rounded-xl border border-border/60 border-l-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md sm:w-[18.5rem]',
                      kindAccent(event.kind),
                    )}
                  >
                    <div className="flex w-[4.25rem] shrink-0 flex-col items-center justify-center border-r border-border/40 bg-background/80 px-2 py-3">
                      {today ? (
                        <span className="mb-0.5 text-[9px] font-semibold uppercase tracking-wide text-foreground">
                          Today
                        </span>
                      ) : null}
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {format(date, 'EEE')}
                      </span>
                      <span
                        className={cn(
                          'text-2xl font-bold tabular-nums leading-none',
                          today && 'text-foreground',
                        )}
                      >
                        {format(date, 'd')}
                      </span>
                      <span className="text-[10px] font-medium text-muted-foreground">
                        {format(date, 'MMM')}
                      </span>
                    </div>

                    <div className="flex min-w-0 flex-1 items-center gap-2.5 px-3 py-2.5">
                      <div
                        className={cn(
                          'flex size-8 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-105',
                          kindBadge(event.kind),
                        )}
                      >
                        <Icon className="size-3.5" />
                      </div>
                      <div className="min-w-0 flex-1 overflow-hidden">
                        <p className="truncate text-sm font-semibold leading-tight whitespace-nowrap transition-colors group-hover:text-foreground">
                          {event.title}
                        </p>
                        <div className="mt-1 flex min-w-0 items-center gap-1.5 overflow-hidden text-xs text-muted-foreground">
                          <span className={cn('shrink-0 rounded px-1.5 py-0.5 font-medium', kindBadge(event.kind))}>
                            {eventKindLabel(event.kind)}
                          </span>
                          {event.detail ? (
                            <>
                              <span className="shrink-0 text-border">·</span>
                              <span className="min-w-0 truncate">{event.detail}</span>
                            </>
                          ) : null}
                        </div>
                        {event.scopeUnitName ? (
                          <p className="mt-0.5 truncate text-[11px] text-muted-foreground/80">
                            {event.scopeUnitName}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </>
        )}
      </div>
    </section>
  )
}
