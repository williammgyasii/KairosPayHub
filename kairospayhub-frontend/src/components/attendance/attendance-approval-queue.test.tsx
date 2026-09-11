import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { AttendanceApprovalQueueItem } from '@/api/attendance'
import { AttendanceApprovalQueue } from '@/components/attendance/attendance-approval-queue'

function item(overrides: Partial<AttendanceApprovalQueueItem> = {}): AttendanceApprovalQueueItem {
  return {
    occurrenceId: 'occ-1',
    scopeNodeId: 'cell-1',
    cellName: 'Titans Cell',
    meetingTypeTitle: 'Sunday Service',
    meetingDate: '2026-09-11',
    submittedAt: null,
    submittedByName: 'Bob Cell',
    enteredByRole: 'CellLeader',
    presentCount: 12,
    absentCount: 0,
    memberCount: 2,
    guestRiskLevel: 'clear',
    guestRiskReasons: [],
    ...overrides,
  }
}

describe('AttendanceApprovalQueue', () => {
  it('warns on a flagged sheet and keeps Approve enabled', () => {
    render(
      <AttendanceApprovalQueue
        items={[
          item({
            guestRiskLevel: 'flagged',
            guestRiskReasons: ['Guests far outnumber members present'],
          }),
        ]}
        loading={false}
        busyKey={null}
        onView={vi.fn()}
        onApprove={vi.fn()}
      />,
    )

    expect(screen.getByText('Guests far outnumber members present')).toBeTruthy()
    expect(screen.getByRole('button', { name: /approve/i })).not.toHaveProperty('disabled', true)
  })

  it('hides the warning on a clear sheet', () => {
    render(
      <AttendanceApprovalQueue
        items={[item()]}
        loading={false}
        busyKey={null}
        onView={vi.fn()}
        onApprove={vi.fn()}
      />,
    )

    expect(screen.queryByText(/guest/i)).toBeNull()
    expect(screen.getByRole('button', { name: /approve/i })).toBeTruthy()
  })
})
