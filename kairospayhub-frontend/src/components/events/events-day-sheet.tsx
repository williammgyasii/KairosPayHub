import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { Cake, ClipboardCheck, Star, Trash2 } from 'lucide-react'
import type { CalendarEvent, CalendarEventKind } from '@/api/events'
import { eventKindLabel, eventKindTone } from '@/lib/calendar-events-ui'
import { SideSheet } from '@/components/ui/side-sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

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

function EventRow({
  event,
  onDelete,
}: {
  event: CalendarEvent
  onDelete?: (event: CalendarEvent) => void
}) {
  const Icon = kindIcon(event.kind)

  return (
    <li className={cn('rounded-lg border px-3 py-2.5', eventKindTone(event.kind))}>
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 size-4 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="font-medium">{event.title}</p>
          <p className="text-xs opacity-80">
            {eventKindLabel(event.kind)}
            {event.detail ? ` · ${event.detail}` : ''}
          </p>
          {event.scopeUnitName && (
            <p className="mt-1 text-[11px] opacity-70">{event.scopeUnitName}</p>
          )}
        </div>
        {event.canEdit && onDelete && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 shrink-0 text-destructive hover:text-destructive"
            onClick={() => onDelete(event)}
            aria-label={`Delete ${event.title}`}
          >
            <Trash2 className="size-4" />
          </Button>
        )}
      </div>
    </li>
  )
}

export function EventsDaySheet({
  open,
  onOpenChange,
  date,
  events,
  canCreate,
  createBusy,
  onCreate,
  onDelete,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  date: Date | null
  events: CalendarEvent[]
  canCreate: boolean
  createBusy?: boolean
  onCreate: (input: { title: string; description: string }) => Promise<void>
  onDelete?: (event: CalendarEvent) => Promise<void>
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')

  useEffect(() => {
    if (open) {
      setTitle('')
      setDescription('')
    }
  }, [open, date])

  if (!date) return null

  return (
    <SideSheet
      open={open}
      onOpenChange={onOpenChange}
      title={format(date, 'EEEE, MMMM d')}
      description={`${events.length} ${events.length === 1 ? 'item' : 'items'} on this day`}
      className="max-w-lg"
    >
      <div className="space-y-6">
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing on this day yet.</p>
        ) : (
          <ul className="space-y-2">
            {events.map((event) => (
              <EventRow
                key={event.id}
                event={event}
                onDelete={onDelete ? (item) => void onDelete(item) : undefined}
              />
            ))}
          </ul>
        )}

        {canCreate && (
          <form
            className="space-y-3 rounded-lg border border-border/60 bg-muted/10 p-4"
            onSubmit={(e) => {
              e.preventDefault()
              if (!title.trim()) return
              void onCreate({ title: title.trim(), description: description.trim() }).then(() => {
                setTitle('')
                setDescription('')
              })
            }}
          >
            <p className="text-sm font-medium">Add event</p>
            <div className="space-y-1">
              <Label htmlFor="event-title">Title</Label>
              <Input
                id="event-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Retreat, prayer night, etc."
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="event-description">Notes (optional)</Label>
              <Input
                id="event-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Details for your cell or unit"
              />
            </div>
            <Button type="submit" disabled={createBusy || !title.trim()}>
              Save event
            </Button>
          </form>
        )}
      </div>
    </SideSheet>
  )
}
