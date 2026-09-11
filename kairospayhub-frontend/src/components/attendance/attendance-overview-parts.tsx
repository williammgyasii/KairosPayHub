import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import type { AttendanceOccurrenceRollup, AttendanceScopeSubmission } from '@/api/attendance'
import { DashboardPageHeader } from '@/components/layout/dashboard-page-header'
import { Spinner } from '@/components/ui/spinner'
import {
  overviewMetricsChips,
  type OverviewMetricsChipId,
} from '@/lib/overview-metrics-chips'
import { cn } from '@/lib/utils'

const CHIP_CLASS: Record<OverviewMetricsChipId, string> = {
  present: 'border-emerald-500/40 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100',
  guests: 'border-violet-300/70 bg-violet-50 text-violet-900 dark:border-violet-500/40 dark:bg-violet-950/40 dark:text-violet-100',
  firstTimers: 'border-sky-300/70 bg-sky-50 text-sky-900 dark:border-sky-500/40 dark:bg-sky-950/40 dark:text-sky-100',
  pending: 'border-amber-300/80 bg-amber-50 text-amber-950 dark:border-amber-500/40 dark:bg-amber-950/40 dark:text-amber-100',
}

export function personKindLabel(kind: string) {
  switch (kind) {
    case 'FirstTimer':
      return 'First timer'
    case 'Invitee':
      return 'Invitee'
    default:
      return 'Member'
  }
}

export function formatServiceDate(meetingDate: string) {
  const parsed = new Date(`${meetingDate}T12:00:00`)
  return Number.isNaN(parsed.getTime())
    ? meetingDate
    : parsed.toLocaleDateString(undefined, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
}

export function approvalStatusLabel(status: string) {
  switch (status) {
    case 'PendingApproval':
      return 'Pending approval'
    case 'Approved':
      return 'Approved'
    case 'Rejected':
      return 'Rejected'
    case 'Draft':
      return 'Draft'
    default:
      return status
  }
}

export function ColumnToggleSwitch({ on }: { on: boolean }) {
  return (
    <span
      className={cn(
        'relative inline-flex h-4 w-7 shrink-0 rounded-full transition-colors',
        on ? 'bg-emerald-500/80' : 'bg-muted',
      )}
      aria-hidden
    >
      <span
        className={cn(
          'absolute top-0.5 size-3 rounded-full bg-white shadow transition-transform',
          on ? 'translate-x-3.5' : 'translate-x-0.5',
        )}
      />
    </span>
  )
}

export function OverviewMetrics({
  rollup,
  pendingCount,
  action,
}: {
  rollup: AttendanceOccurrenceRollup | null | undefined
  pendingCount: number
  action?: ReactNode
}) {
  const chips = overviewMetricsChips({
    present: rollup?.totalPresent ?? 0,
    guests: rollup?.guestsPresent ?? 0,
    firstTimers: rollup?.firstTimersPresent ?? 0,
    pending: pendingCount,
  })

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-border/60 bg-background px-3 py-3 sm:px-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap" aria-label="Attendance totals">
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
      {action ? <div className="flex shrink-0 flex-wrap items-center gap-3">{action}</div> : null}
    </section>
  )
}

export function MeetingTypesList({
  meetingTypes,
  loading,
  error,
}: {
  meetingTypes: { id: string; title: string; dayOfWeek: string; submissionLayerName?: string | null }[]
  loading: boolean
  error: string | null
}) {
  return (
    <div className="space-y-6">
      <DashboardPageHeader
        breadcrumbs={[
          { label: 'Dashboard', to: '/' },
          { label: 'Attendance', to: '/attendance/overview' },
          { label: 'Metrics' },
        ]}
        title="Attendance metrics"
        description="Choose a meeting type to view occurrence totals and unit roll calls."
      />

      {error && <p className="text-sm text-destructive">{error}</p>}

      {loading ? (
        <Spinner label="Loading meetings…" />
      ) : meetingTypes.length === 0 ? (
        <p className="text-sm text-muted-foreground">No meeting types set up yet.</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {meetingTypes.map((type) => (
            <li key={type.id}>
              <Link
                to={`/attendance/overview/${type.id}`}
                className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
              >
                <div className="min-w-0">
                  <p className="font-medium">{type.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {type.dayOfWeek}
                    {type.submissionLayerName
                      ? ` · Submissions at ${type.submissionLayerName}`
                      : null}
                  </p>
                </div>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function filterUnitRows(
  rows: AttendanceScopeSubmission[],
  search: string,
  statusFilter: string,
) {
  const q = search.trim().toLowerCase()
  return rows.filter((row) => {
    if (statusFilter && row.approvalStatus !== statusFilter) return false
    if (!q) return true
    return (
      row.scopeUnitName.toLowerCase().includes(q) ||
      (row.parentUnitName?.toLowerCase().includes(q) ?? false) ||
      approvalStatusLabel(row.approvalStatus).toLowerCase().includes(q)
    )
  })
}
