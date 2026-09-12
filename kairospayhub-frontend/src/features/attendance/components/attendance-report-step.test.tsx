import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AttendanceReportStep } from '@/features/attendance/components/attendance-report-step'
import { DEFAULT_REPORT_SCHEMA } from '@/features/attendance/lib/report-policy'
import { markAttendanceWizardSteps } from '@/features/attendance/lib/report-policy'

describe('AttendanceReportStep', () => {
  it('does not add a report step for a no-report type', () => {
    expect(markAttendanceWizardSteps({ requiresReport: false })).toEqual(['pick', 'mark'])
  })

  it('keeps Submit off when required photos are missing', () => {
    render(
      <AttendanceReportStep
        type={{ requiresReport: true, reportSchema: DEFAULT_REPORT_SCHEMA }}
        answers={{ taught: 'Taught', shared: 'Shared', photos: [] }}
        onChange={vi.fn()}
        onSaveDraft={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: /submit for approval/i })).toHaveProperty(
      'disabled',
      true,
    )
    expect(screen.getByRole('button', { name: /save draft/i })).not.toHaveProperty('disabled', true)
  })
})
