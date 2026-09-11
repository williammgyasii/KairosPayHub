import { Save, Send } from 'lucide-react'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { rollCallToolbarChips, type RollCallToolbarChipId } from '@/features/attendance/lib/roll-call-toolbar'
import { cn } from '@/shared/lib/utils'

const CHIP_CLASS: Record<RollCallToolbarChipId, string> = {
  present: 'border-emerald-500/40 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100',
  absent: 'border-red-500/40 bg-red-50 text-red-900 dark:bg-red-950/40 dark:text-red-100',
  left: 'border-dashed border-border bg-muted/40 text-muted-foreground',
  firstTimers: 'border-sky-300/70 bg-sky-50 text-sky-900 dark:border-sky-500/40 dark:bg-sky-950/40 dark:text-sky-100',
}

export function AttendanceRollCallToolbar({
  meetingTitle,
  meetingDateLabel,
  unitName,
  statusLabel,
  statusClassName,
  present,
  absent,
  unmarked,
  firstTimers,
  disabled,
  busy,
  busyAction,
  canSubmit,
  onSave,
  onSubmit,
}: {
  meetingTitle: string
  meetingDateLabel: string
  unitName?: string | null
  statusLabel?: string | null
  statusClassName?: string
  present: number
  absent: number
  unmarked: number
  firstTimers: number
  disabled?: boolean
  busy?: boolean
  busyAction?: 'save' | 'submit' | null
  canSubmit?: boolean
  onSave: () => void
  onSubmit: () => void
}) {
  const chips = rollCallToolbarChips({ present, absent, unmarked, firstTimers })

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-background px-3 py-3 sm:px-4">
      <div className="min-w-0 space-y-0.5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="truncate text-base font-semibold tracking-tight">{meetingTitle}</h2>
          {statusLabel ? (
            <Badge variant="outline" className={statusClassName}>
              {statusLabel}
            </Badge>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">
          {[unitName, meetingDateLabel].filter(Boolean).join(' · ')}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap" aria-label="Roll call counts">
        {chips.map((chip) => (
          <span
            key={chip.id}
            className={cn(
              'inline-flex min-w-0 items-center justify-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium sm:justify-start',
              CHIP_CLASS[chip.id],
            )}
          >
            <span className="tabular-nums text-sm font-semibold">{chip.count}</span>
            {chip.label}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 lg:flex lg:justify-end">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="w-full rounded-md lg:w-auto"
          disabled={disabled || busy}
          loading={busyAction === 'save'}
          loadingLabel="Saving…"
          onClick={onSave}
        >
          <Save className="size-3.5" />
          Save draft
        </Button>
        <Button
          type="button"
          size="sm"
          className="w-full rounded-md lg:w-auto"
          disabled={!canSubmit || busy}
          loading={busyAction === 'submit'}
          loadingLabel="Submitting…"
          onClick={onSubmit}
        >
          <Send className="size-3.5" />
          <span className="sm:hidden">Submit</span>
          <span className="hidden sm:inline">Submit for approval</span>
        </Button>
      </div>
    </div>
  )
}
