import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { AttendanceMeetingType } from '@/features/attendance/api'
import { MeetingTypesTable } from '@/features/attendance/components/meeting-types-table'

function type(overrides: Partial<AttendanceMeetingType> = {}): AttendanceMeetingType {
  return {
    id: 'mt-1',
    title: 'Sunday Service',
    recurrenceKind: 'Weekly',
    dayOfWeek: 'Sunday',
    scopeKind: 'ChurchWide',
    scopeNodeId: null,
    opensDayOffset: 0,
    opensTimeUtc: '14:00:00',
    deadlineDayOffset: 1,
    deadlineTimeUtc: '00:00:00',
    autoGenerateWeeksAhead: 8,
    isAlwaysOpen: false,
    isActive: true,
    createdAt: '2026-09-11T00:00:00Z',
    requiresReport: true,
    ...overrides,
  }
}

describe('MeetingTypesTable', () => {
  it('renders a TanStack table with equal data columns and a Report value', () => {
    render(
      <MeetingTypesTable
        types={[type(), type({ id: 'mt-2', title: 'Cell meeting', requiresReport: false })]}
        canManage
        emptyMessage="No meeting types yet."
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    )

    expect(screen.getByRole('table')).toBeTruthy()
    expect(screen.getByRole('button', { name: /title/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /report/i })).toBeTruthy()
    expect(screen.getByText('Sunday Service')).toBeTruthy()
    expect(screen.getAllByText('Yes').length).toBeGreaterThan(0)
    expect(screen.getAllByText('No').length).toBeGreaterThan(0)
  })

  it('hides row actions when the viewer cannot manage', () => {
    render(
      <MeetingTypesTable
        types={[type()]}
        canManage={false}
        emptyMessage="No meeting types yet."
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    )

    expect(screen.queryByRole('button', { name: /open menu/i })).toBeNull()
  })
})
