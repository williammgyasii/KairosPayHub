import { useEffect, useState } from 'react'
import type { ApiClient } from '@/api/core'
import type { AttendanceMeetingType } from '@/api/attendance'
import { createMeetingType, updateMeetingType } from '@/api/attendance'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  DAY_OFFSET_OPTIONS,
  DEFAULT_MEETING_TYPE_WINDOW,
  OPEN_NOW_DEMO_WINDOW,
  WEEKDAY_OPTIONS,
  todayDayOfWeek,
  toApiTimeValue,
  toTimeInputValue,
} from '@/lib/attendance-ui'

export type MeetingTypeFormMode = 'create' | 'edit'

interface MeetingTypeFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: MeetingTypeFormMode
  meetingType?: AttendanceMeetingType | null
  api: ApiClient
  onSaved: () => Promise<void>
}

export function MeetingTypeFormModal({
  open,
  onOpenChange,
  mode,
  meetingType,
  api,
  onSaved,
}: MeetingTypeFormModalProps) {
  const [title, setTitle] = useState('')
  const [dayOfWeek, setDayOfWeek] = useState<string>(DEFAULT_MEETING_TYPE_WINDOW.dayOfWeek)
  const [opensDayOffset, setOpensDayOffset] = useState<number>(DEFAULT_MEETING_TYPE_WINDOW.opensDayOffset)
  const [opensTime, setOpensTime] = useState(toTimeInputValue(DEFAULT_MEETING_TYPE_WINDOW.opensTimeUtc))
  const [deadlineDayOffset, setDeadlineDayOffset] = useState<number>(
    DEFAULT_MEETING_TYPE_WINDOW.deadlineDayOffset,
  )
  const [deadlineTime, setDeadlineTime] = useState(
    toTimeInputValue(DEFAULT_MEETING_TYPE_WINDOW.deadlineTimeUtc),
  )
  const [openNowForDemo, setOpenNowForDemo] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    if (mode === 'edit' && meetingType) {
      setTitle(meetingType.title)
      setOpensDayOffset(meetingType.opensDayOffset)
      setOpensTime(toTimeInputValue(meetingType.opensTimeUtc))
      setDeadlineDayOffset(meetingType.deadlineDayOffset)
      setDeadlineTime(toTimeInputValue(meetingType.deadlineTimeUtc))
      return
    }
    setTitle('')
    setDayOfWeek(DEFAULT_MEETING_TYPE_WINDOW.dayOfWeek)
    setOpensDayOffset(DEFAULT_MEETING_TYPE_WINDOW.opensDayOffset)
    setOpensTime(toTimeInputValue(DEFAULT_MEETING_TYPE_WINDOW.opensTimeUtc))
    setDeadlineDayOffset(DEFAULT_MEETING_TYPE_WINDOW.deadlineDayOffset)
    setDeadlineTime(toTimeInputValue(DEFAULT_MEETING_TYPE_WINDOW.deadlineTimeUtc))
    setOpenNowForDemo(false)
  }, [open, mode, meetingType])

  useEffect(() => {
    if (mode !== 'create' || !openNowForDemo) return
    setDayOfWeek(todayDayOfWeek())
    setOpensDayOffset(OPEN_NOW_DEMO_WINDOW.opensDayOffset)
    setOpensTime(toTimeInputValue(OPEN_NOW_DEMO_WINDOW.opensTimeUtc))
    setDeadlineDayOffset(OPEN_NOW_DEMO_WINDOW.deadlineDayOffset)
    setDeadlineTime(toTimeInputValue(OPEN_NOW_DEMO_WINDOW.deadlineTimeUtc))
  }, [mode, openNowForDemo])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const windowInput = {
        title: title.trim(),
        opensDayOffset,
        opensTimeUtc: toApiTimeValue(opensTime),
        deadlineDayOffset,
        deadlineTimeUtc: toApiTimeValue(deadlineTime),
      }

      if (mode === 'edit' && meetingType) {
        await updateMeetingType(api, meetingType.id, windowInput)
      } else {
        await createMeetingType(api, {
          ...DEFAULT_MEETING_TYPE_WINDOW,
          ...windowInput,
          dayOfWeek: openNowForDemo ? todayDayOfWeek() : dayOfWeek,
          ...(openNowForDemo ? OPEN_NOW_DEMO_WINDOW : {}),
          openNowForDemo,
        })
      }

      onOpenChange(false)
      await onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save meeting type')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={mode === 'edit' ? 'Edit meeting type' : 'Add meeting type'}
      description={
        mode === 'edit'
          ? 'Update the name and submission window. Schedule day is set when the type is created.'
          : 'Set how often this meeting repeats. Occurrences are generated automatically (e.g. every Sunday for 8 weeks). Times are GMT (Ghana).'
      }
      size="lg"
    >
      <form onSubmit={onSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="meeting-title">Name</Label>
          <Input
            id="meeting-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Sunday Service"
            required
          />
        </div>

        {mode === 'create' ? (
          <>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-dashed border-primary/40 bg-primary/5 px-4 py-3">
              <input
                type="checkbox"
                checked={openNowForDemo}
                onChange={(e) => setOpenNowForDemo(e.target.checked)}
                className="mt-1"
              />
              <span className="space-y-0.5">
                <span className="block text-sm font-medium">Open now (demo)</span>
                <span className="block text-xs text-muted-foreground">
                  Creates today&apos;s service with roll call open immediately so you can demo
                  attendance.
                </span>
              </span>
            </label>

            <div className="space-y-2">
              <Label htmlFor="meeting-day">Frequency</Label>
              <select
                id="meeting-day"
                value={dayOfWeek}
                onChange={(e) => setDayOfWeek(e.target.value)}
                disabled={openNowForDemo}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-60"
              >
                {WEEKDAY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {openNowForDemo && (
                <p className="text-xs text-muted-foreground">
                  Scheduled for today ({todayDayOfWeek()}).
                </p>
              )}
            </div>
          </>
        ) : meetingType ? (
          <p className="text-sm text-muted-foreground">
            Schedule: {meetingType.recurrenceKind} · {meetingType.dayOfWeek}
          </p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="opens-day">Submission opens</Label>
            <select
              id="opens-day"
              value={opensDayOffset}
              onChange={(e) => setOpensDayOffset(Number(e.target.value))}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {DAY_OFFSET_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="opens-time">Open time (GMT)</Label>
            <Input
              id="opens-time"
              type="time"
              value={opensTime}
              onChange={(e) => setOpensTime(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="deadline-day">Submission closes</Label>
            <select
              id="deadline-day"
              value={deadlineDayOffset}
              onChange={(e) => setDeadlineDayOffset(Number(e.target.value))}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {DAY_OFFSET_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="deadline-time">Close time (GMT)</Label>
            <Input
              id="deadline-time"
              type="time"
              value={deadlineTime}
              onChange={(e) => setDeadlineTime(e.target.value)}
              required
            />
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : mode === 'edit' ? 'Save changes' : 'Create meeting type'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
