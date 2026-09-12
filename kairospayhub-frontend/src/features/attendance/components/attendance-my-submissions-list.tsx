import type { AttendanceMySubmission } from '@/features/attendance/api'
import { formatOccurrenceLabel } from '@/features/attendance/lib/attendance-ui'
import { InlineSpinner } from '@/shared/ui/spinner'

export function AttendanceMySubmissionsList({
  rows,
  loading,
}: {
  rows: AttendanceMySubmission[]
  loading: boolean
}) {
  return (
    <section className="space-y-3 border-t pt-5">
      <div>
        <h2 className="text-sm font-medium">Your submissions</h2>
        <p className="text-sm text-muted-foreground">
          Recent roll calls you have submitted from your units.
        </p>
      </div>
      {loading && rows.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <InlineSpinner /> Loading…
        </p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No submitted roll calls yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b bg-muted/30 text-left text-xs text-muted-foreground">
                <th className="px-3 py-2 font-medium">Meeting</th>
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="px-3 py-2 font-medium">Unit</th>
                <th className="px-3 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((row) => (
                <tr key={`${row.occurrenceId}:${row.scopeNodeId}`}>
                  <td className="px-3 py-2.5 font-medium">{row.meetingTypeTitle}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">
                    {formatOccurrenceLabel({
                      id: row.occurrenceId,
                      meetingDate: row.meetingDate,
                      status: 'Open',
                      submissionOpensAt: '',
                      submissionDeadlineAt: '',
                      scopeSubmissionCount: 1,
                    }).split(' · ')[0]}
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">{row.scopeUnitName}</td>
                  <td className="px-3 py-2.5">
                    {row.approvalStatus === 'PendingApproval'
                      ? 'Pending approval'
                      : row.approvalStatus === 'Approved'
                        ? 'Approved'
                        : row.approvalStatus === 'Rejected'
                          ? 'Rejected'
                          : row.approvalStatus}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
