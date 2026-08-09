import { useEffect, useMemo, useState } from 'react'
import { Check } from 'lucide-react'
import type { AttendanceApprovalQueueItem } from '@/api/attendance'
import {
  buildInviteeDrafts,
  type InviteeRollCallDraft,
} from '@/components/attendance/attendance-roll-call-sheet'
import { MemberRollCallGrid } from '@/components/attendance/member-roll-call-grid'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Spinner } from '@/components/ui/spinner'
import { useGetScopeRollCallReviewQuery } from '@/store/attendanceApi'
import { cn } from '@/lib/utils'

type RollCallTab = 'members' | 'invitees' | 'firstTimers'

function formatServiceDate(meetingDate: string) {
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

function ReadOnlyInviteeTable({
  rows,
  emptyMessage,
}: {
  rows: InviteeRollCallDraft[]
  emptyMessage: string
}) {
  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{emptyMessage}</p>
  }

  return (
    <div className="overflow-x-auto border-y">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            <th className="px-3 py-2 font-medium">Name</th>
            <th className="px-3 py-2 font-medium">Invited by</th>
            <th className="px-3 py-2 font-medium">Number</th>
            <th className="px-3 py-2 font-medium">Location</th>
            <th className="px-3 py-2 font-medium">First timer</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((row) => (
            <tr key={row.inviteeId}>
              <td className="px-3 py-3 font-medium">{row.inviteeName}</td>
              <td className="px-3 py-3 text-muted-foreground">{row.invitedByMemberName || '—'}</td>
              <td className="px-3 py-3 text-muted-foreground">{row.inviteePhone || '—'}</td>
              <td className="px-3 py-3 text-muted-foreground">{row.inviteeResidence || '—'}</td>
              <td className="px-3 py-3">{row.wasFirstTimer ? 'Yes' : 'No'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function InvitationSummary({ rows }: { rows: InviteeRollCallDraft[] }) {
  const summaries = useMemo(() => {
    const counts = new Map<string, { name: string; count: number }>()
    for (const row of rows) {
      if (row.status !== 'Present' || !row.invitedByMemberId) continue
      const existing = counts.get(row.invitedByMemberId)
      if (existing) {
        existing.count += 1
      } else {
        counts.set(row.invitedByMemberId, {
          name: row.invitedByMemberName ?? 'Member',
          count: 1,
        })
      }
    }
    return [...counts.values()].sort(
      (a, b) => b.count - a.count || a.name.localeCompare(b.name),
    )
  }, [rows])

  if (summaries.length === 0) return null

  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Invitations this service
      </p>
      <ul className="mt-2 space-y-1 text-sm">
        {summaries.map((summary) => (
          <li key={summary.name}>
            <span className="font-medium">{summary.name}</span>
            <span className="text-muted-foreground">
              {' '}
              · {summary.count} invitee{summary.count === 1 ? '' : 's'} present
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function FirstTimerMetrics({ rows }: { rows: InviteeRollCallDraft[] }) {
  const neverBefore = rows.filter((row) => row.priorChurchAttendance === 'Never').length
  const onceBefore = rows.filter((row) => row.priorChurchAttendance === 'Once').length
  const moreThanOnce = rows.filter((row) => row.priorChurchAttendance === 'MoreThanOnce').length

  const stats = [
    { label: 'Total first timers', value: rows.length },
    { label: 'Never at any church', value: neverBefore },
    { label: 'Been once before', value: onceBefore },
    { label: 'Been more than once', value: moreThanOnce },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 border-b pb-4 sm:grid-cols-4">
      {stats.map((stat) => (
        <div key={stat.label}>
          <p className="text-xs text-muted-foreground">{stat.label}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{stat.value}</p>
        </div>
      ))}
    </div>
  )
}

interface AttendanceApprovalDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: AttendanceApprovalQueueItem | null
  busy?: boolean
  onApprove?: () => void
}

export function AttendanceApprovalDetailModal({
  open,
  onOpenChange,
  item,
  busy,
  onApprove,
}: AttendanceApprovalDetailModalProps) {
  const [tab, setTab] = useState<RollCallTab>('members')

  const {
    data: review,
    isFetching: loading,
    error: reviewError,
  } = useGetScopeRollCallReviewQuery(
    {
      occurrenceId: item?.occurrenceId ?? '',
      scopeNodeId: item?.scopeNodeId ?? '',
    },
    { skip: !open || !item?.occurrenceId || !item?.scopeNodeId },
  )

  const error = reviewError ? 'Could not load roll call' : null

  useEffect(() => {
    if (!open) setTab('members')
  }, [open])

  const inviteeRows = useMemo(
    () => (review ? buildInviteeDrafts(review.inviteeEntries) : []),
    [review],
  )

  const firstTimerRows = useMemo(
    () => inviteeRows.filter((row) => row.wasFirstTimer),
    [inviteeRows],
  )

  const presentCount = review?.entries.filter((entry) => entry.status === 'Present').length ?? 0
  const absentCount = review?.entries.filter((entry) => entry.status === 'Absent').length ?? 0

  const tabs: { id: RollCallTab; label: string; count: number }[] = [
    { id: 'members', label: 'Members', count: review?.entries.length ?? 0 },
    { id: 'invitees', label: 'Invitees', count: inviteeRows.length },
    { id: 'firstTimers', label: 'First timers', count: firstTimerRows.length },
  ]

  if (!item) return null

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={item.cellName}
      description={`${item.meetingTypeTitle} · ${formatServiceDate(item.meetingDate)}`}
      size="xl"
      className="max-w-4xl"
    >
      {loading ? (
        <Spinner label="Loading roll call…" />
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : review ? (
        <div className="space-y-5">
          <dl className="grid gap-4 border-b border-border/60 pb-5 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Present
              </dt>
              <dd className="mt-1.5 text-xl font-semibold tabular-nums">{presentCount}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Absent
              </dt>
              <dd className="mt-1.5 text-xl font-semibold tabular-nums">{absentCount}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Members
              </dt>
              <dd className="mt-1.5 text-xl font-semibold tabular-nums">{review.entries.length}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Submitted by
              </dt>
              <dd className="mt-1.5 text-sm">{item.submittedByName ?? '—'}</dd>
            </div>
          </dl>

          <div className="flex flex-wrap gap-x-1 gap-y-2 border-b">
            {tabs.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => setTab(entry.id)}
                className={cn(
                  'border-b-2 px-2 pb-2 text-sm font-medium transition-colors',
                  tab === entry.id
                    ? 'border-foreground text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                {entry.label}
                <span className="ml-1 text-xs text-muted-foreground">({entry.count})</span>
              </button>
            ))}
          </div>

          {tab === 'members' && (
            <MemberRollCallGrid
              readOnly
              members={review.entries.map((entry) => ({
                id: entry.memberId,
                name: entry.memberName,
                status:
                  entry.status === 'Present' || entry.status === 'Absent'
                    ? entry.status
                    : 'Unrecorded',
              }))}
            />
          )}

          {tab === 'invitees' && (
            <div className="space-y-4">
              <InvitationSummary rows={inviteeRows} />
              <ReadOnlyInviteeTable
                rows={inviteeRows}
                emptyMessage="No invitees recorded for this service."
              />
            </div>
          )}

          {tab === 'firstTimers' && (
            <div className="space-y-4">
              <FirstTimerMetrics rows={firstTimerRows} />
              <InvitationSummary rows={firstTimerRows} />
              <ReadOnlyInviteeTable
                rows={firstTimerRows}
                emptyMessage="No first timers recorded for this service."
              />
            </div>
          )}

          <div className="flex justify-end gap-2 border-t border-border/60 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button type="button" disabled={busy} loading={busy} loadingLabel="Approving…" onClick={onApprove}>
              <Check className="size-3.5" />
              Approve
            </Button>
          </div>
        </div>
      ) : null}
    </Modal>
  )
}
