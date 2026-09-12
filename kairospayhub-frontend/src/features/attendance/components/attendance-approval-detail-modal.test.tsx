import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { AttendanceApprovalQueueItem, AttendanceScopeRollCallReview } from '@/features/attendance/api'
import { DEFAULT_REPORT_SCHEMA } from '@/features/attendance/lib/report-policy'
import { AttendanceApprovalDetailModal } from '@/features/attendance/components/attendance-approval-detail-modal'

const { reviewState } = vi.hoisted(() => ({
  reviewState: { current: null as AttendanceScopeRollCallReview | null },
}))

vi.mock('@/features/attendance/api/attendanceApi', () => ({
  useGetScopeRollCallReviewQuery: () => ({
    data: reviewState.current,
    isFetching: false,
    error: undefined,
  }),
}))

function queueItem(): AttendanceApprovalQueueItem {
  return {
    occurrenceId: 'occ-1',
    scopeNodeId: 'cell-1',
    cellName: 'Cell A',
    meetingTypeTitle: 'Sunday Service',
    meetingDate: '2026-09-11',
    submittedAt: null,
    submittedByName: 'Bob Cell',
    enteredByRole: 'CellLeader',
    presentCount: 1,
    absentCount: 0,
    memberCount: 1,
    guestRiskLevel: 'clear',
    guestRiskReasons: [],
  }
}

function review(overrides: Partial<AttendanceScopeRollCallReview> = {}): AttendanceScopeRollCallReview {
  return {
    occurrenceId: 'occ-1',
    scopeNodeId: 'cell-1',
    meetingTypeTitle: 'Sunday Service',
    meetingDate: '2026-09-11',
    approvalStatus: 'PendingApproval',
    entries: [{ id: 'e1', memberId: 'm1', memberName: 'Member Kay', memberScopeNodeId: 'cell-1', status: 'Present' }],
    inviteeEntries: [],
    guestRiskLevel: 'clear',
    guestRiskReasons: [],
    report: null,
    ...overrides,
  }
}

describe('AttendanceApprovalDetailModal', () => {
  it('does not show a Report pane when the sheet has no report', () => {
    reviewState.current = review()
    render(
      <AttendanceApprovalDetailModal open item={queueItem()} onOpenChange={vi.fn()} onApprove={vi.fn()} />,
    )

    expect(screen.getByText('Member Kay')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Report' })).toBeNull()
    expect(screen.queryByText('What was taught')).toBeNull()
  })

  it('splits report and roll call into panes when a payload exists', async () => {
    const user = userEvent.setup()
    reviewState.current = review({
      report: {
        schema: DEFAULT_REPORT_SCHEMA,
        answers: {
          taught: 'Romans 8',
          shared: 'Testimony',
          photos: ['https://cdn.example/a.jpg'],
        },
      },
    })
    render(
      <AttendanceApprovalDetailModal open item={queueItem()} onOpenChange={vi.fn()} onApprove={vi.fn()} />,
    )

    expect(screen.getByRole('button', { name: 'Roll call' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Report' })).toBeTruthy()
    expect(screen.getByText('Member Kay')).toBeTruthy()
    expect(screen.queryByText('Romans 8')).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Report' }))
    expect(screen.getByText('Romans 8')).toBeTruthy()
    expect(screen.getByText('What was taught')).toBeTruthy()
    expect(screen.queryByText('Member Kay')).toBeNull()
    expect(screen.queryByRole('button', { name: /Members/ })).toBeNull()
  })
})
