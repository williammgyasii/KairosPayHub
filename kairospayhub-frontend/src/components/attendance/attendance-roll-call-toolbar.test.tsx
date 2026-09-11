import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AttendanceRollCallToolbar } from '@/components/attendance/attendance-roll-call-toolbar'

const baseProps = {
  meetingTitle: 'Sunday Service',
  meetingDateLabel: 'Friday, September 11, 2026',
  unitName: 'Titans Cell',
  statusLabel: 'Draft',
  present: 8,
  absent: 4,
  unmarked: 10,
  firstTimers: 2,
  canSubmit: false,
  onSave: vi.fn(),
  onSubmit: vi.fn(),
}

describe('AttendanceRollCallToolbar', () => {
  it('shows live chips and hides Left and First timers at zero', () => {
    const { rerender } = render(<AttendanceRollCallToolbar {...baseProps} />)

    expect(screen.getByRole('button', { name: /submit/i })).toBeTruthy()
    expect(screen.getByText('Sunday Service')).toBeTruthy()
    expect(screen.getByText(/Titans Cell/)).toBeTruthy()
    expect(screen.getByText('Present')).toBeTruthy()
    expect(screen.getByText('Absent')).toBeTruthy()
    expect(screen.getByText('Left')).toBeTruthy()
    expect(screen.getByText('First timers')).toBeTruthy()

    rerender(
      <AttendanceRollCallToolbar {...baseProps} unmarked={0} firstTimers={0} canSubmit />,
    )
    expect(screen.queryByText('Left')).toBeNull()
    expect(screen.queryByText('First timers')).toBeNull()
    expect(screen.getByText('Present')).toBeTruthy()
    expect(screen.getByText('Absent')).toBeTruthy()
  })
})
