import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import type { DashboardOutletContext } from '@/components/layout/dashboard-layout'
import { DashboardPageHeader } from '@/components/layout/dashboard-page-header'
import type { AttendanceApprovalQueueItem } from '@/api/attendance'
import {
  useApproveOccurrenceScopeMutation,
  useListApprovalQueueQuery,
} from '@/store/attendanceApi'
import { AttendanceApprovalDetailModal } from '@/components/attendance/attendance-approval-detail-modal'
import { AttendanceApprovalQueue } from '@/components/attendance/attendance-approval-queue'
import { cn } from '@/lib/utils'

function StatusBanner({
  tone,
  message,
}: {
  tone: 'error' | 'success'
  message: string
}) {
  return (
    <p
      className={cn(
        'text-sm',
        tone === 'error' ? 'text-destructive' : 'text-emerald-700',
      )}
    >
      {message}
    </p>
  )
}

export function AttendanceApprovalsPage() {
  const { me } = useOutletContext<DashboardOutletContext>()
  const { data: items = [], isLoading: loading, isFetching, error: queueError } =
    useListApprovalQueueQuery()
  const [approveOccurrenceScope, { isLoading: approving }] = useApproveOccurrenceScopeMutation()
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [viewItem, setViewItem] = useState<AttendanceApprovalQueueItem | null>(null)
  const [viewOpen, setViewOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function onApprove(item: AttendanceApprovalQueueItem) {
    const rowKey = `${item.occurrenceId}:${item.scopeNodeId}`
    setBusyKey(rowKey)
    setError(null)
    setMessage(null)
    try {
      await approveOccurrenceScope({
        occurrenceId: item.occurrenceId,
        scopeNodeId: item.scopeNodeId,
      }).unwrap()
      setMessage(`Approved roll call for ${item.cellName}.`)
      setViewOpen(false)
      setViewItem(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not approve roll call')
    } finally {
      setBusyKey(null)
    }
  }

  function onView(item: AttendanceApprovalQueueItem) {
    setViewItem(item)
    setViewOpen(true)
  }

  const scopeLabel =
    me.scopeUnitName ??
    (me.role === 'FellowshipLeader'
      ? 'your fellowship'
      : me.role === 'PFCCManager'
        ? 'your PFCC'
        : 'your church')

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        breadcrumbs={[
          { label: 'Overview', to: '/' },
          { label: 'Attendance', to: '/attendance/approvals' },
          { label: 'Approvals' },
        ]}
        title="Attendance approvals"
        description={`Review and approve roll calls submitted by leaders in ${scopeLabel}.`}
      />

      {(error || queueError) && (
        <StatusBanner tone="error" message={error ?? 'Could not load approval queue'} />
      )}
      {message && <StatusBanner tone="success" message={message} />}

      <AttendanceApprovalQueue
        items={items}
        loading={loading}
        busyKey={busyKey ?? (approving ? 'mutation' : null)}
        onView={onView}
        onApprove={onApprove}
      />

      {isFetching && !loading && (
        <p className="text-xs text-muted-foreground">Refreshing approval queue…</p>
      )}

      <AttendanceApprovalDetailModal
        open={viewOpen}
        onOpenChange={(open) => {
          setViewOpen(open)
          if (!open) setViewItem(null)
        }}
        item={viewItem}
        busy={viewItem ? busyKey === `${viewItem.occurrenceId}:${viewItem.scopeNodeId}` : false}
        onApprove={viewItem ? () => void onApprove(viewItem) : undefined}
      />
    </div>
  )
}
