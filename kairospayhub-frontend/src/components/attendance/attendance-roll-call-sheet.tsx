import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react'
import { Plus } from 'lucide-react'
import type {
  AttendanceEntry,
  AttendanceInviteeEntry,
  AttendanceOccurrenceDetail,
} from '@/api/attendance'
import { graduateCellInvitee, listCellInvitees } from '@/api/attendance'
import { useApi } from '@/api/core'
import { rollCallState, rollCallStatusLabel } from '@/lib/attendance-ui'
import { AddInviteeModal } from '@/components/attendance/add-invitee-modal'
import { AttendanceRollCallToolbar } from '@/components/attendance/attendance-roll-call-toolbar'
import { MemberRollCallGrid } from '@/components/attendance/member-roll-call-grid'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type EntryStatus = 'Present' | 'Absent' | 'Unrecorded'
type RollCallTab = 'members' | 'invitees'

export type InviteeRollCallDraft = {
  inviteeId: string
  inviteeName: string
  inviteePhone: string
  inviteeResidence: string
  priorChurchAttendance: string
  status: EntryStatus
  wasFirstTimer: boolean
  graduatedMemberId: string | null
  invitedByMemberId: string | null
  invitedByMemberName: string | null
}

function yesNo(value: boolean) {
  return value ? 'Yes' : 'No'
}

function InviteeTable({
  rows,
  emptyMessage,
  showRegisterAction,
  disabled,
  busy,
  onGraduateInvitee,
  onToggleFirstTimer,
}: {
  rows: InviteeRollCallDraft[]
  emptyMessage: string
  showRegisterAction?: boolean
  disabled?: boolean
  busy?: boolean
  onGraduateInvitee?: (inviteeId: string) => void
  onToggleFirstTimer?: (inviteeId: string, wasFirstTimer: boolean) => void
}) {
  if (rows.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">{emptyMessage}</p>
  }

  return (
    <div className="overflow-x-auto border-y">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            <th className="px-3 py-2 font-medium">Name</th>
            <th className="px-3 py-2 font-medium">Invited by</th>
            <th className="px-3 py-2 font-medium">Number</th>
            <th className="px-3 py-2 font-medium">Location</th>
            <th className="px-3 py-2 font-medium">First timer</th>
            {showRegisterAction && <th className="px-3 py-2 font-medium">Member</th>}
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((row) => (
            <tr key={row.inviteeId}>
              <td className="px-3 py-3 font-medium">{row.inviteeName}</td>
              <td className="px-3 py-3 text-muted-foreground">{row.invitedByMemberName || '—'}</td>
              <td className="px-3 py-3 text-muted-foreground">{row.inviteePhone || '—'}</td>
              <td className="px-3 py-3 text-muted-foreground">{row.inviteeResidence || '—'}</td>
              <td className="px-3 py-3">
                {onToggleFirstTimer && !disabled ? (
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={row.wasFirstTimer}
                      disabled={busy}
                      onChange={(e) => onToggleFirstTimer(row.inviteeId, e.target.checked)}
                    />
                    {yesNo(row.wasFirstTimer)}
                  </label>
                ) : (
                  yesNo(row.wasFirstTimer)
                )}
              </td>
              {showRegisterAction && (
                <td className="px-3 py-3">
                  {row.graduatedMemberId ? (
                    <span className="text-muted-foreground">Registered</span>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={disabled || busy}
                      onClick={() => onGraduateInvitee?.(row.inviteeId)}
                    >
                      Register
                    </Button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

interface AttendanceRollCallSheetProps {
  detail: AttendanceOccurrenceDetail
  scopeNodeId: string
  cellName?: string | null
  values: Record<string, EntryStatus>
  inviteeValues: InviteeRollCallDraft[]
  onChange: (memberId: string, status: EntryStatus) => void
  onInviteeValuesChange: Dispatch<SetStateAction<InviteeRollCallDraft[]>>
  busy?: boolean
  busyAction?: 'save' | 'submit' | null
  onSave: () => void
  onSubmit: () => void
  viewerRole?: string
  timeZoneId?: string | null
}

function scopeSubmission(detail: AttendanceOccurrenceDetail, scopeNodeId: string) {
  return detail.scopeSubmissions.find((row) => row.scopeNodeId === scopeNodeId) ?? null
}

function approvalBadgeVariant(status: string) {
  switch (status) {
    case 'Approved':
      return 'border-emerald-200 bg-emerald-50 text-emerald-800'
    case 'PendingApproval':
      return 'border-amber-200 bg-amber-50 text-amber-800'
    case 'Rejected':
      return 'border-red-200 bg-red-50 text-red-800'
    default:
      return 'border-border bg-muted text-muted-foreground'
  }
}

function InviteeList({
  rows,
  disabled,
  busy,
  showMemberActions,
  emptyMessage,
  onGraduateInvitee,
  onToggleFirstTimer,
}: {
  rows: InviteeRollCallDraft[]
  disabled: boolean
  busy?: boolean
  showMemberActions: boolean
  emptyMessage: string
  onGraduateInvitee: (inviteeId: string) => void
  onToggleFirstTimer: (inviteeId: string, wasFirstTimer: boolean) => void
}) {
  return (
    <InviteeTable
      rows={rows}
      emptyMessage={emptyMessage}
      showRegisterAction={showMemberActions}
      disabled={disabled}
      busy={busy}
      onGraduateInvitee={onGraduateInvitee}
      onToggleFirstTimer={onToggleFirstTimer}
    />
  )
}

export function AttendanceRollCallSheet({
  detail,
  scopeNodeId,
  cellName,
  values,
  inviteeValues,
  onChange,
  onInviteeValuesChange,
  busy,
  busyAction = null,
  onSave,
  onSubmit,
  viewerRole = 'CellLeader',
  timeZoneId = null,
}: AttendanceRollCallSheetProps) {
  const api = useApi()
  const [tab, setTab] = useState<RollCallTab>('members')
  const [addInviteeOpen, setAddInviteeOpen] = useState(false)
  const submission = scopeSubmission(detail, scopeNodeId)
  const { editable, message: blockMessage } = rollCallState(detail, scopeNodeId, undefined, timeZoneId)
  const disabled = !editable

  const entries = useMemo(
    () => [...detail.entries].sort((a, b) => a.memberName.localeCompare(b.memberName)),
    [detail.entries],
  )

  const cellMembers = useMemo(
    () => entries.map((entry) => ({ id: entry.memberId, name: entry.memberName })),
    [entries],
  )

  const firstTimerCount = useMemo(
    () => inviteeValues.filter((row) => row.wasFirstTimer).length,
    [inviteeValues],
  )

  const markedCount = entries.filter((entry) => {
    const status = values[entry.memberId] ?? entry.status
    return status === 'Present' || status === 'Absent'
  }).length

  const presentCount = entries.filter((entry) => {
    const status = values[entry.memberId] ?? entry.status
    return status === 'Present'
  }).length

  const absentCount = entries.filter((entry) => {
    const status = values[entry.memberId] ?? entry.status
    return status === 'Absent'
  }).length

  useEffect(() => {
    let cancelled = false
    void listCellInvitees(api, scopeNodeId)
      .then((rows) => {
        if (cancelled) return
        const active = rows.filter((row) => row.isActive)
        onInviteeValuesChange((current) => {
          const byId = new Map(current.map((row) => [row.inviteeId, row]))
          for (const invitee of active) {
            const existing = byId.get(invitee.id)
            byId.set(invitee.id, {
              inviteeId: invitee.id,
              inviteeName: invitee.name,
              inviteePhone: invitee.phone ?? '',
              inviteeResidence: existing?.inviteeResidence ?? invitee.residence ?? '',
              priorChurchAttendance:
                existing?.priorChurchAttendance ?? invitee.priorChurchAttendance ?? '',
              status: 'Present',
              wasFirstTimer: existing?.wasFirstTimer ?? invitee.isFirstTimer,
              graduatedMemberId: invitee.graduatedMemberId,
              invitedByMemberId: existing?.invitedByMemberId ?? invitee.invitedByMemberId,
              invitedByMemberName: existing?.invitedByMemberName ?? invitee.invitedByMemberName,
            })
          }
          return [...byId.values()].sort((a, b) => a.inviteeName.localeCompare(b.inviteeName))
        })
      })
      .catch(() => {
        if (!cancelled) onInviteeValuesChange([])
      })
    return () => {
      cancelled = true
    }
  }, [api, onInviteeValuesChange, scopeNodeId])

  const allMembersMarked = markedCount === entries.length
  const canSubmit = editable && allMembersMarked

  function onInviteeCreated(invitee: {
    id: string
    name: string
    phone: string
    residence: string
    isFirstTimer: boolean
    priorChurchAttendance: string
    invitedByMemberId: string
    invitedByMemberName: string
  }) {
    onInviteeValuesChange((current) => [
      ...current,
      {
        inviteeId: invitee.id,
        inviteeName: invitee.name,
        inviteePhone: invitee.phone,
        inviteeResidence: invitee.residence,
        priorChurchAttendance: invitee.priorChurchAttendance,
        status: 'Present',
        wasFirstTimer: invitee.isFirstTimer,
        graduatedMemberId: null,
        invitedByMemberId: invitee.invitedByMemberId,
        invitedByMemberName: invitee.invitedByMemberName,
      },
    ])
    setTab('invitees')
  }

  async function onGraduateInvitee(inviteeId: string) {
    const member = await graduateCellInvitee(api, inviteeId)
    onInviteeValuesChange((current) =>
      current.map((row) =>
        row.inviteeId === inviteeId ? { ...row, graduatedMemberId: member.id } : row,
      ),
    )
  }

  const tabs: { id: RollCallTab; label: string; count: number }[] = [
    { id: 'members', label: 'Members', count: entries.length },
    {
      id: 'invitees',
      label: 'Invitees',
      count: inviteeValues.length,
    },
  ]

  const meetingDateLabel = new Date(`${detail.meetingDate}T00:00:00`).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })

  return (
    <div className="space-y-5">
      <AddInviteeModal
        open={addInviteeOpen}
        onOpenChange={setAddInviteeOpen}
        api={api}
        scopeNodeId={scopeNodeId}
        cellMembers={cellMembers}
        disabled={disabled || busy}
        onCreated={onInviteeCreated}
      />

      <AttendanceRollCallToolbar
        meetingTitle={detail.meetingTypeTitle}
        meetingDateLabel={meetingDateLabel}
        unitName={cellName}
        statusLabel={
          submission
            ? rollCallStatusLabel(
                submission.approvalStatus,
                viewerRole,
                submission.pendingApproverRole,
              )
            : null
        }
        statusClassName={
          submission ? approvalBadgeVariant(submission.approvalStatus) : undefined
        }
        present={presentCount}
        absent={absentCount}
        unmarked={entries.length - markedCount}
        firstTimers={firstTimerCount}
        disabled={disabled}
        busy={busy}
        busyAction={busyAction}
        canSubmit={canSubmit}
        onSave={onSave}
        onSubmit={onSubmit}
      />

      {blockMessage && (
        <p className={cn('text-sm', disabled ? 'text-muted-foreground' : 'text-amber-700')}>
          {blockMessage}
        </p>
      )}

      <div className="flex flex-col gap-3 border-b sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-x-1 gap-y-2">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={cn(
                'border-b-2 px-2 pb-2 text-sm font-medium transition-colors',
                tab === item.id
                  ? 'border-foreground text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {item.label}
              <span className="ml-1 text-xs text-muted-foreground">({item.count})</span>
            </button>
          ))}
        </div>

        {tab === 'invitees' && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 rounded-md"
            disabled={disabled || busy}
            onClick={() => setAddInviteeOpen(true)}
          >
            <Plus className="mr-1.5 size-3.5" />
            Add invitee
          </Button>
        )}
      </div>

      {tab === 'members' && (
        <MemberRollCallGrid
          disabled={disabled || busy}
          members={entries.map((entry) => {
            const status = values[entry.memberId] ?? (entry.status as EntryStatus)
            return {
              id: entry.memberId,
              name: entry.memberName,
              status,
            }
          })}
          onToggleStatus={(memberId, status) => onChange(memberId, status)}
        />
      )}

      {tab === 'invitees' && (
        <InviteeList
          rows={inviteeValues}
          disabled={disabled}
          busy={busy}
          showMemberActions
          emptyMessage="No invitees yet. Add someone and mark whether they are a first timer."
          onGraduateInvitee={(inviteeId) => void onGraduateInvitee(inviteeId)}
          onToggleFirstTimer={(inviteeId, wasFirstTimer) =>
            onInviteeValuesChange((current) =>
              current.map((row) =>
                row.inviteeId === inviteeId ? { ...row, wasFirstTimer } : row,
              ),
            )
          }
        />
      )}
    </div>
  )
}

export function buildEntryValues(entries: AttendanceEntry[]) {
  return Object.fromEntries(
    entries.map((entry) => [entry.memberId, entry.status as EntryStatus]),
  ) as Record<string, EntryStatus>
}

export function buildInviteeDrafts(rows: AttendanceInviteeEntry[]): InviteeRollCallDraft[] {
  return rows.map((row) => ({
    inviteeId: row.inviteeId,
    inviteeName: row.inviteeName,
    inviteePhone: row.inviteePhone ?? '',
    inviteeResidence: row.inviteeResidence ?? '',
    priorChurchAttendance: row.inviteePriorChurchAttendance ?? '',
    status: row.status === 'Absent' ? 'Absent' : 'Present',
    wasFirstTimer: row.wasFirstTimer,
    graduatedMemberId: null,
    invitedByMemberId: row.invitedByMemberId,
    invitedByMemberName: row.invitedByMemberName,
  }))
}

export { isRollCallEditable } from '@/lib/attendance-ui'
