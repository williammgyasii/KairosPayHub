import { cn } from '@/lib/utils'

type MemberStatus = 'Present' | 'Absent' | 'Unrecorded'

export type MemberRollCallGridItem = {
  id: string
  name: string
  status: MemberStatus
}

function statusLabel(status: MemberStatus) {
  switch (status) {
    case 'Present':
      return 'Present'
    case 'Absent':
      return 'Absent'
    default:
      return 'Not marked'
  }
}

function boxClassName(status: MemberStatus, interactive: boolean) {
  return cn(
    'flex min-h-[5.5rem] flex-col items-center justify-center rounded-lg border-2 p-3 text-center transition-colors',
    interactive && 'cursor-pointer hover:brightness-[0.98]',
    status === 'Present' && 'border-emerald-500 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/30',
    status === 'Absent' && 'border-red-500 bg-red-50 text-red-950 dark:bg-red-950/30',
    status === 'Unrecorded' && 'border-dashed border-border bg-muted/20 text-muted-foreground',
  )
}

export function MemberRollCallGrid({
  members,
  readOnly = false,
  disabled = false,
  onToggleStatus,
}: {
  members: MemberRollCallGridItem[]
  readOnly?: boolean
  disabled?: boolean
  onToggleStatus?: (memberId: string, status: 'Present' | 'Absent') => void
}) {
  if (members.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No members recorded for this cell.
      </p>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {members.map((member) => {
        const interactive = !readOnly && !disabled && Boolean(onToggleStatus)
        const content = (
          <>
            <span className="line-clamp-2 text-sm font-medium leading-snug">{member.name}</span>
            <span className="mt-1.5 text-[11px] font-medium uppercase tracking-wide opacity-80">
              {statusLabel(member.status)}
            </span>
          </>
        )

        if (!interactive) {
          return (
            <div key={member.id} className={boxClassName(member.status, false)}>
              {content}
            </div>
          )
        }

        return (
          <button
            key={member.id}
            type="button"
            disabled={disabled}
            className={boxClassName(member.status, true)}
            onClick={() => {
              const next = member.status === 'Present' ? 'Absent' : 'Present'
              onToggleStatus?.(member.id, next)
            }}
          >
            {content}
          </button>
        )
      })}
    </div>
  )
}
