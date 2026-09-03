import {
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
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useMemo } from 'react'
import type { CalendarEvent } from '@/api/events'
import { eventKindLabel, eventKindTone } from '@/lib/calendar-events-ui'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function groupEventsByDate(events: CalendarEvent[]): Map<string, CalendarEvent[]> {
  const map = new Map<string, CalendarEvent[]>()
  for (const event of events) {
    const bucket = map.get(event.date) ?? []
    bucket.push(event)
    map.set(event.date, bucket)
  }
  return map
}

export function EventsCalendarGrid({
  month,
  onMonthChange,
  events,
  selectedDate,
  onSelectDate,
}: {
  month: Date
  onMonthChange: (month: Date) => void
  events: CalendarEvent[]
  selectedDate: Date | null
  onSelectDate: (date: Date) => void
}) {
  const eventsByDate = useMemo(() => groupEventsByDate(events), [events])

  const days = useMemo(() => {
    const monthStart = startOfMonth(month)
    const monthEnd = endOfMonth(month)
    return eachDayOfInterval({
      start: startOfWeek(monthStart),
      end: endOfWeek(monthEnd),
    })
  }, [month])

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-border/60 bg-background">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border/60 px-3 py-2 sm:px-4">
        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-tight sm:text-lg">{format(month, 'MMMM yyyy')}</h2>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <Button type="button" variant="outline" size="icon" onClick={() => onMonthChange(addMonths(month, -1))}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => onMonthChange(new Date())}>
            Today
          </Button>
          <Button type="button" variant="outline" size="icon" onClick={() => onMonthChange(addMonths(month, 1))}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div className="grid shrink-0 grid-cols-7 border-b border-border/60 bg-muted/20 text-center text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:text-xs">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="px-1 py-1.5 sm:px-2 sm:py-2">
            {label}
          </div>
        ))}
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-7 grid-rows-6">
        {days.map((day) => {
          const iso = format(day, 'yyyy-MM-dd')
          const dayEvents = eventsByDate.get(iso) ?? []
          const inMonth = isSameMonth(day, month)
          const selected = selectedDate ? isSameDay(day, selectedDate) : false

          const today = isToday(day)

          return (
            <button
              key={iso}
              type="button"
              onClick={() => onSelectDate(day)}
              className={cn(
                'flex h-full min-h-0 flex-col p-1.5 text-left transition-colors sm:p-2',
                !today && 'border-b border-r border-border/40 hover:bg-muted/20',
                !inMonth && !today && 'bg-muted/10 text-muted-foreground',
                today &&
                  'm-0.5 rounded-lg border-2 border-primary bg-primary text-white shadow-sm hover:bg-primary/90 sm:m-1',
                selected &&
                  !today &&
                  'rounded-md bg-primary/5 ring-1 ring-inset ring-primary/30',
                selected &&
                  today &&
                  'ring-2 ring-primary-foreground/25 ring-offset-1 ring-offset-primary',
              )}
            >
              <span
                className={cn(
                  'mb-1 inline-flex size-6 shrink-0 items-center justify-center text-xs font-medium sm:mb-1.5 sm:size-7 sm:text-sm',
                  today && 'font-semibold text-white',
                )}
              >
                {format(day, 'd')}
              </span>

              <div className="min-h-0 flex-1 space-y-0.5 overflow-hidden sm:space-y-1">
                {dayEvents.slice(0, 2).map((event) => (
                  <div
                    key={event.id}
                    className={cn(
                      'truncate rounded border px-1 py-px text-[9px] font-medium sm:px-1.5 sm:py-0.5 sm:text-[10px]',
                      today
                        ? 'border-white/30 bg-white/15 text-white'
                        : eventKindTone(event.kind),
                    )}
                    title={event.title}
                  >
                    {event.title}
                  </div>
                ))}
                {dayEvents.length > 2 && (
                  <p
                    className={cn(
                      'text-[9px] font-medium sm:text-[10px]',
                      today ? 'text-white/85' : 'text-muted-foreground',
                    )}
                  >
                    +{dayEvents.length - 2}
                  </p>
                )}
              </div>
            </button>
          )
        })}
      </div>

      <div className="flex shrink-0 flex-wrap gap-3 border-t border-border/60 px-3 py-1.5 text-[10px] text-muted-foreground sm:gap-4 sm:px-4 sm:py-2 sm:text-xs">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-rose-500/70" />
          {eventKindLabel('Birthday')}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-sky-500/70" />
          {eventKindLabel('Meeting')}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-violet-500/70" />
          {eventKindLabel('Custom')}
        </span>
      </div>
    </div>
  )
}
