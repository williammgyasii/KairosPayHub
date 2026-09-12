import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { Cake, ClipboardCheck, Plus, Star, Trash2 } from 'lucide-react'
import type { CalendarEvent, CalendarEventKind } from '@/features/events/api'
import {
  calendarEventAlertOptions,
  eventKindLabel,
  eventKindTone,
  type CalendarEventAlertOption,
} from '@/features/events/lib/calendar-events-ui'
import type { Me } from '@/api/auth'
import { SideSheet } from '@/shared/ui/side-sheet'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { cn } from '@/shared/lib/utils'

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
    <li className={cn('rounded-md border px-2.5 py-2', eventKindTone(event.kind))}>
      <div className="flex items-start gap-2.5">
        <Icon className="mt-0.5 size-3.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-snug">{event.title}</p>
          <p className="text-[11px] opacity-80">
            {eventKindLabel(event.kind)}
            {event.detail ? ` · ${event.detail}` : ''}
          </p>
          {event.scopeUnitName && (
            <p className="mt-0.5 text-[10px] opacity-70">{event.scopeUnitName}</p>
          )}
        </div>
        {event.canEdit && onDelete && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 shrink-0 text-destructive hover:text-destructive"
            onClick={() => onDelete(event)}
            aria-label={`Delete ${event.title}`}
          >
            <Trash2 className="size-3.5" />
          </Button>
        )}
      </div>
    </li>
  )
}

function AlertOptions({
  options,
  notifyUp,
  notifyDown,
  onNotifyUpChange,
  onNotifyDownChange,
}: {
  options: CalendarEventAlertOption
  notifyUp: boolean
  notifyDown: boolean
  onNotifyUpChange: (value: boolean) => void
  onNotifyDownChange: (value: boolean) => void
}) {
  if (!options.upLabel && !options.downLabel) return null

  return (
    <div className="space-y-2 rounded-md border border-border/60 bg-muted/10 p-3">
      <p className="text-xs font-medium text-foreground">Notifications</p>
      {options.upLabel ? (
        <label className="flex cursor-pointer items-start gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            className="mt-0.5 size-3.5 shrink-0 accent-primary"
            checked={notifyUp}
            onChange={(e) => onNotifyUpChange(e.target.checked)}
          />
          <span>{options.upLabel}</span>
        </label>
      ) : null}
      {options.downLabel ? (
        <label className="flex cursor-pointer items-start gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            className="mt-0.5 size-3.5 shrink-0 accent-primary"
            checked={notifyDown}
            onChange={(e) => onNotifyDownChange(e.target.checked)}
          />
          <span>{options.downLabel}</span>
        </label>
      ) : null}
    </div>
  )
}

export function EventsDaySheet({
  open,
  onOpenChange,
  date,
  events,
  me,
  canCreate,
  createBusy,
  startWithAddForm,
  onCreate,
  onDelete,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  date: Date | null
  events: CalendarEvent[]
  me: Me
  canCreate: boolean
  createBusy?: boolean
  startWithAddForm?: boolean
  onCreate: (input: {
    title: string
    description: string
    notifyLeadersUp: boolean
    notifyLeadersDown: boolean
  }) => Promise<void>
  onDelete?: (event: CalendarEvent) => Promise<void>
}) {
  const alertOptions = calendarEventAlertOptions(me)
  const [showAddForm, setShowAddForm] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [notifyUp, setNotifyUp] = useState(false)
  const [notifyDown, setNotifyDown] = useState(false)

  useEffect(() => {
    if (open) {
      setShowAddForm(startWithAddForm ?? false)
      setTitle('')
      setDescription('')
      setNotifyUp(false)
      setNotifyDown(false)
    }
  }, [open, date, startWithAddForm])

  if (!date) return null

  return (
    <SideSheet
      open={open}
      onOpenChange={onOpenChange}
      title={format(date, 'EEEE, MMM d')}
      description={`${events.length} ${events.length === 1 ? 'item' : 'items'}`}
      cover="page"
    >
      <div className="flex min-h-full flex-col gap-4">
        {canCreate ? (
          showAddForm ? (
            <form
              className="space-y-3 rounded-lg border border-border/60 bg-muted/5 p-3"
              onSubmit={(e) => {
                e.preventDefault()
                if (!title.trim()) return
                void onCreate({
                  title: title.trim(),
                  description: description.trim(),
                  notifyLeadersUp: notifyUp,
                  notifyLeadersDown: notifyDown,
                }).then(() => {
                  setTitle('')
                  setDescription('')
                  setNotifyUp(false)
                  setNotifyDown(false)
                  setShowAddForm(false)
                })
              }}
            >
              <p className="text-sm font-semibold">New event</p>
              <div className="space-y-1">
                <Label htmlFor="event-title" className="text-xs">
                  Title
                </Label>
                <Input
                  id="event-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Retreat, prayer night, etc."
                  className="h-9 text-sm"
                  required
                  autoFocus
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="event-description" className="text-xs">
                  Notes (optional)
                </Label>
                <Input
                  id="event-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Details for your cell or unit"
                  className="h-9 text-sm"
                />
              </div>
              <AlertOptions
                options={alertOptions}
                notifyUp={notifyUp}
                notifyDown={notifyDown}
                onNotifyUpChange={setNotifyUp}
                onNotifyDownChange={setNotifyDown}
              />
              <div className="flex gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setShowAddForm(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="flex-1"
                  disabled={createBusy || !title.trim()}
                >
                  Save event
                </Button>
              </div>
            </form>
          ) : (
            <Button
              type="button"
              size="sm"
              className="w-full gap-1.5"
              onClick={() => setShowAddForm(true)}
            >
              <Plus className="size-3.5" />
              New event
            </Button>
          )
        ) : null}

        {events.length === 0 && !showAddForm ? (
          <p className="text-xs text-muted-foreground">Nothing on this day yet.</p>
        ) : events.length > 0 ? (
          <div className="space-y-2">
            {showAddForm ? (
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                On this day
              </p>
            ) : null}
            <ul className="space-y-1.5">
              {events.map((event) => (
                <EventRow
                  key={event.id}
                  event={event}
                  onDelete={onDelete ? (item) => void onDelete(item) : undefined}
                />
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </SideSheet>
  )
}
