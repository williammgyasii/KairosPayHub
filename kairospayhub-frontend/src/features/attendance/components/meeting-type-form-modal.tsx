import { useEffect, useState } from 'react'
import { HelpCircle } from 'lucide-react'
import type { ApiClient } from '@/shared/api'
import type { AttendanceMeetingType } from '@/features/attendance/api'
import { createMeetingType, updateMeetingType } from '@/features/attendance/api'
import { Modal } from '@/shared/ui/modal'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/shared/ui/tooltip'
import {
  DEFAULT_MEETING_TYPE_WINDOW,
  WEEKDAY_OPTIONS,
  formatTimezoneLabel,
  toApiTimeValue,
  toTimeInputValue,
  weeklyDayOffsetOptions,
} from '@/features/attendance/lib/attendance-ui'
import { useGetStructureTreeQuery } from '@/store/structureApi'

export type MeetingTypeFormMode = 'create' | 'edit'

interface MeetingTypeFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: MeetingTypeFormMode
  meetingType?: AttendanceMeetingType | null
  api: ApiClient
  timeZoneId?: string | null
  onSaved: () => Promise<void>
}

function FieldHelp({ label, hint }: { label: string; hint: string }) {
  return (
    <div className="flex min-h-5 items-center gap-1.5">
      <span>{label}</span>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex text-muted-foreground hover:text-foreground"
            aria-label={`About ${label}`}
          >
            <HelpCircle className="size-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[260px] text-left leading-relaxed">
          {hint}
        </TooltipContent>
      </Tooltip>
    </div>
  )
}

const selectClassName =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm'

export function MeetingTypeFormModal({
  open,
  onOpenChange,
  mode,
  meetingType,
  api,
  timeZoneId,
  onSaved,
}: MeetingTypeFormModalProps) {
  const [title, setTitle] = useState('')
  const [dayOfWeek, setDayOfWeek] = useState<string>(DEFAULT_MEETING_TYPE_WINDOW.dayOfWeek)
  const [isAlwaysOpen, setIsAlwaysOpen] = useState(false)
  const [opensDayOffset, setOpensDayOffset] = useState<number>(DEFAULT_MEETING_TYPE_WINDOW.opensDayOffset)
  const [opensTime, setOpensTime] = useState(toTimeInputValue(DEFAULT_MEETING_TYPE_WINDOW.opensTimeUtc))
  const [deadlineDayOffset, setDeadlineDayOffset] = useState<number>(
    DEFAULT_MEETING_TYPE_WINDOW.deadlineDayOffset,
  )
  const [deadlineTime, setDeadlineTime] = useState(
    toTimeInputValue(DEFAULT_MEETING_TYPE_WINDOW.deadlineTimeUtc),
  )
  const [submissionLayerId, setSubmissionLayerId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: structureTree } = useGetStructureTreeQuery({})
  const layers = structureTree?.template?.layers ?? []

  const frequencyDay =
    mode === 'edit' && meetingType ? meetingType.dayOfWeek : dayOfWeek
  const dayOptions = weeklyDayOffsetOptions(frequencyDay)
  const tzLabel = formatTimezoneLabel(timeZoneId)

  useEffect(() => {
    if (!open) return
    setError(null)
    if (mode === 'edit' && meetingType) {
      setTitle(meetingType.title)
      setIsAlwaysOpen(meetingType.isAlwaysOpen)
      setOpensDayOffset(Math.min(1, Math.max(0, meetingType.opensDayOffset)))
      setOpensTime(toTimeInputValue(meetingType.opensTimeUtc))
      setDeadlineDayOffset(Math.min(1, Math.max(0, meetingType.deadlineDayOffset)))
      setDeadlineTime(toTimeInputValue(meetingType.deadlineTimeUtc))
      setSubmissionLayerId(meetingType.submissionLayerId ?? '')
      return
    }
    setTitle('')
    setDayOfWeek(DEFAULT_MEETING_TYPE_WINDOW.dayOfWeek)
    setIsAlwaysOpen(false)
    setOpensDayOffset(DEFAULT_MEETING_TYPE_WINDOW.opensDayOffset)
    setOpensTime(toTimeInputValue(DEFAULT_MEETING_TYPE_WINDOW.opensTimeUtc))
    setDeadlineDayOffset(DEFAULT_MEETING_TYPE_WINDOW.deadlineDayOffset)
    setDeadlineTime(toTimeInputValue(DEFAULT_MEETING_TYPE_WINDOW.deadlineTimeUtc))
    setSubmissionLayerId('')
  }, [open, mode, meetingType])

  useEffect(() => {
    if (!open || mode === 'edit') return
    if (submissionLayerId) return
    const preferred =
      layers.find((l) => l.standardType === 'Cell')?.id
      ?? layers[layers.length - 1]?.id
      ?? ''
    if (preferred) setSubmissionLayerId(preferred)
  }, [open, mode, layers, submissionLayerId])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const windowInput = {
        title: title.trim(),
        isAlwaysOpen,
        submissionLayerId: submissionLayerId || undefined,
        opensDayOffset: isAlwaysOpen ? 0 : opensDayOffset,
        opensTimeUtc: toApiTimeValue(isAlwaysOpen ? '00:00' : opensTime),
        deadlineDayOffset: isAlwaysOpen ? 1 : deadlineDayOffset,
        deadlineTimeUtc: toApiTimeValue(isAlwaysOpen ? '23:59' : deadlineTime),
      }

      if (mode === 'edit' && meetingType) {
        await updateMeetingType(api, meetingType.id, windowInput)
      } else {
        await createMeetingType(api, {
          ...DEFAULT_MEETING_TYPE_WINDOW,
          ...windowInput,
          dayOfWeek,
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
          : `Set how often this meeting repeats. Occurrences are generated automatically. Times are in ${tzLabel}.`
      }
      size="lg"
    >
      <TooltipProvider>
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
            <div className="space-y-2">
              <Label htmlFor="meeting-day">Frequency</Label>
              <select
                id="meeting-day"
                value={dayOfWeek}
                onChange={(e) => setDayOfWeek(e.target.value)}
                className={selectClassName}
              >
                {WEEKDAY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          ) : meetingType ? (
            <p className="text-sm text-muted-foreground">
              Schedule: {meetingType.recurrenceKind} · {meetingType.dayOfWeek}
            </p>
          ) : null}

          {layers.length > 0 ? (
            <div className="space-y-2">
              <Label htmlFor="submission-layer">
                <FieldHelp
                  label="Submissions start at"
                  hint="Leaders of units on this structure layer mark roll call. The leader one level above approves."
                />
              </Label>
              <select
                id="submission-layer"
                value={submissionLayerId}
                onChange={(e) => setSubmissionLayerId(e.target.value)}
                className={selectClassName}
                required
              >
                {layers.map((layer) => (
                  <option key={layer.id} value={layer.id}>
                    {layer.displayName}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <label className="flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3">
            <input
              type="checkbox"
              checked={isAlwaysOpen}
              onChange={(e) => setIsAlwaysOpen(e.target.checked)}
              className="mt-1"
            />
            <span className="space-y-0.5">
              <span className="flex items-center gap-1.5 text-sm font-medium">
                <FieldHelp
                  label="Always open"
                  hint="Leaders can submit roll call for each occurrence anytime — no open time or deadline."
                />
              </span>
              <span className="block text-xs text-muted-foreground">
                Skip submission windows; roll call stays available for every occurrence.
              </span>
            </span>
          </label>

          {!isAlwaysOpen ? (
            <div className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="opens-day" className="block">
                  <FieldHelp
                    label="Submission opens"
                    hint="When leaders may start marking attendance for this meeting occurrence."
                  />
                </Label>
                <select
                  id="opens-day"
                  value={opensDayOffset}
                  onChange={(e) => setOpensDayOffset(Number(e.target.value))}
                  className={selectClassName}
                >
                  {dayOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="opens-time" className="flex min-h-5 items-center">
                  Open time ({tzLabel})
                </Label>
                <Input
                  id="opens-time"
                  type="time"
                  value={opensTime}
                  onChange={(e) => setOpensTime(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deadline-day" className="block">
                  <FieldHelp
                    label="Deadline"
                    hint="When roll call submissions stop for that meeting occurrence."
                  />
                </Label>
                <select
                  id="deadline-day"
                  value={deadlineDayOffset}
                  onChange={(e) => setDeadlineDayOffset(Number(e.target.value))}
                  className={selectClassName}
                >
                  {dayOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="deadline-time" className="flex min-h-5 items-center">
                  Deadline time ({tzLabel})
                </Label>
                <Input
                  id="deadline-time"
                  type="time"
                  value={deadlineTime}
                  onChange={(e) => setDeadlineTime(e.target.value)}
                  required
                />
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Submission opens and deadline are not used while Always open is on.
            </p>
          )}

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
      </TooltipProvider>
    </Modal>
  )
}
