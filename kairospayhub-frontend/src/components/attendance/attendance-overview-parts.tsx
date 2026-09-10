import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import type { AttendanceOccurrenceRollup, AttendanceScopeSubmission } from '@/api/attendance'
import { DashboardPageHeader } from '@/components/layout/dashboard-page-header'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'

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
  leading,
  action,
}: {
  rollup: AttendanceOccurrenceRollup | null | undefined
  pendingCount: number
  leading?: ReactNode
  action?: ReactNode
}) {
  const stats = [
    { id: 'present', label: 'Present', value: rollup?.totalPresent ?? '—' },
    {
      id: 'members',
      label: 'Members',
      value: rollup?.membersPresent ?? '—',
      hint: rollup ? `${rollup.membersAbsent} absent` : undefined,
    },
    { id: 'firstTimers', label: 'First-timers', value: rollup?.firstTimersPresent ?? '—' },
    {
      id: 'pending',
      label: 'Pending',
      value: pendingCount,
      tone: pendingCount > 0 ? ('amber' as const) : undefined,
    },
  ]

  return (
    <section className="flex flex-col gap-3 rounded-lg border px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
      {leading ? <div className="min-w-0 shrink-0 text-sm">{leading}</div> : null}
      <div className="flex flex-wrap items-start gap-x-5 gap-y-3 sm:gap-x-8">
        {stats.map((stat) => (
          <div key={stat.id} className="min-w-[5rem]">
            <p className="text-eyebrow">
              {stat.label}
            </p>
            <p
              className={cn(
                'mt-0.5 text-lg font-semibold tabular-nums leading-none',
                stat.tone === 'amber' && 'text-amber-800 dark:text-amber-200',
              )}
            >
              {stat.value}
            </p>
            {stat.hint ? (
              <p className="mt-1 text-[11px] text-muted-foreground">{stat.hint}</p>
            ) : null}
          </div>
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
