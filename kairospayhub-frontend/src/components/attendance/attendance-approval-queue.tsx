import { Check, Eye } from 'lucide-react'
import type { AttendanceApprovalQueueItem } from '@/api/attendance'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'

function formatServiceDate(meetingDate: string) {
  const parsed = new Date(`${meetingDate}T12:00:00`)
  return Number.isNaN(parsed.getTime())
    ? meetingDate
    : parsed.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
}

export function AttendanceApprovalQueue({
  items,
  loading,
  busyKey,
  onView,
  onApprove,
}: {
  items: AttendanceApprovalQueueItem[]
  loading: boolean
  busyKey: string | null
  onView: (item: AttendanceApprovalQueueItem) => void
  onApprove: (item: AttendanceApprovalQueueItem) => Promise<void>
}) {
  if (loading) {
    return <Spinner label="Loading approval queue…" />
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No roll calls waiting for your approval.
      </p>
    )
  }

  return (
    <div className="divide-y rounded-md border">
      {items.map((item) => {
        const rowKey = `${item.occurrenceId}:${item.scopeNodeId}`
        const busy = busyKey === rowKey
        return (
          <div
            key={rowKey}
            className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="space-y-1">
              <p className="font-medium">{item.cellName}</p>
              <p className="text-sm text-muted-foreground">
                {item.meetingTypeTitle} · {formatServiceDate(item.meetingDate)}
              </p>
              <p className="text-xs text-muted-foreground">
                {item.presentCount} present · {item.absentCount} absent · {item.memberCount} members
                {item.submittedByName ? ` · submitted by ${item.submittedByName}` : ''}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => onView(item)}
              >
                <Eye className="size-4" />
                View
              </Button>
              <Button size="sm" disabled={busy} onClick={() => void onApprove(item)}>
                <Check className="size-4" />
                {busy ? 'Approving…' : 'Approve'}
              </Button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
