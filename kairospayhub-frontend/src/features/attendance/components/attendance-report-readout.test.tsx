import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AttendanceReportReadout } from '@/features/attendance/components/attendance-report-readout'
import { DEFAULT_REPORT_SCHEMA } from '@/features/attendance/lib/report-policy'

describe('AttendanceReportReadout', () => {
  it('does not render an empty report block when there is no report', () => {
    const { container } = render(<AttendanceReportReadout report={null} />)
    expect(container).toBeEmptyDOMElement()
    expect(screen.queryByText('Meeting report')).toBeNull()
  })

  it('shows prompt labels, answers, and photos when a payload exists', () => {
    render(
      <AttendanceReportReadout
        report={{
          schema: DEFAULT_REPORT_SCHEMA,
          answers: {
            taught: 'Romans 8',
            shared: 'Testimony',
            photos: ['https://cdn.example/a.jpg'],
          },
        }}
      />,
    )

    expect(screen.getByText('What was taught')).toBeTruthy()
    expect(screen.getByText('Romans 8')).toBeTruthy()
    expect(screen.getByRole('img')).toHaveProperty('src', 'https://cdn.example/a.jpg')
  })
})
