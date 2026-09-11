import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { AttendanceOccurrenceRollup } from '@/api/attendance'
import { OverviewMetrics } from '@/components/attendance/attendance-overview-parts'

const rollup = {
  totalPresent: 18,
  membersAbsent: 2,
  guestsPresent: 6,
  firstTimersPresent: 0,
} as AttendanceOccurrenceRollup

describe('OverviewMetrics', () => {
  it('shows Present, Guests, First timers, and Pending without Absent', () => {
    render(<OverviewMetrics rollup={rollup} pendingCount={1} />)

    expect(screen.getByText('Present')).toBeTruthy()
    expect(screen.getByText('18')).toBeTruthy()
    expect(screen.getByText('Guests')).toBeTruthy()
    expect(screen.getByText('First timers')).toBeTruthy()
    expect(screen.getByText('Pending')).toBeTruthy()
    expect(screen.queryByText('Absent')).toBeNull()
  })
})
