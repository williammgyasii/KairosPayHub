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
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b bg-muted/30 text-left text-xs text-muted-foreground">
            <th className="px-3 py-2 font-medium">Unit</th>
            <th className="px-3 py-2 font-medium">Meeting</th>
            <th className="px-3 py-2 font-medium">Date</th>
            <th className="px-3 py-2 font-medium">Counts</th>
            <th className="px-3 py-2 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {items.map((item) => {
            const rowKey = `${item.occurrenceId}:${item.scopeNodeId}`
            const busy = busyKey === rowKey
            return (
              <tr key={rowKey} className="align-middle">
                <td className="px-3 py-2.5">
                  <p className="font-medium">{item.cellName}</p>
                  {item.submittedByName ? (
                    <p className="text-xs text-muted-foreground">by {item.submittedByName}</p>
                  ) : null}
                </td>
                <td className="px-3 py-2.5 text-muted-foreground">{item.meetingTypeTitle}</td>
                <td className="px-3 py-2.5 text-muted-foreground">
                  {formatServiceDate(item.meetingDate)}
                </td>
                <td className="px-3 py-2.5 text-muted-foreground">
                  {item.presentCount} present · {item.absentCount} absent
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex justify-end gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-8 rounded-md px-2"
                      disabled={busy}
                      onClick={() => onView(item)}
                    >
                      <Eye className="size-3.5" />
                      View
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="h-8 rounded-md px-2.5"
                      disabled={busy}
                      loading={busy}
                      loadingLabel="…"
                      onClick={() => void onApprove(item)}
                    >
                      <Check className="size-3.5" />
                      Approve
                    </Button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
