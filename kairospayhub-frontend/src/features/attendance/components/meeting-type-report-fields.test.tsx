import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { MeetingTypeReportFields } from '@/features/attendance/components/meeting-type-report-fields'
import {
  DEFAULT_REPORT_SCHEMA,
  type ReportField,
} from '@/features/attendance/lib/report-policy'

function Harness({
  initialRequires = false,
  initialSchema = [],
}: {
  initialRequires?: boolean
  initialSchema?: ReportField[]
}) {
  const [requiresReport, setRequiresReport] = useState(initialRequires)
  const [schema, setSchema] = useState<ReportField[]>(initialSchema)
  return (
    <MeetingTypeReportFields
      requiresReport={requiresReport}
      schema={schema}
      onRequiresReportChange={setRequiresReport}
      onSchemaChange={setSchema}
    />
  )
}

describe('MeetingTypeReportFields', () => {
  it('shows the default four prompts when the toggle turns on with an empty schema', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.click(screen.getByRole('checkbox', { name: /requires a meeting report/i }))

    expect(screen.getByDisplayValue('What was taught')).toBeTruthy()
    expect(screen.getByDisplayValue('What was shared')).toBeTruthy()
    expect(screen.getByDisplayValue('Prayer / follow-up')).toBeTruthy()
    expect((document.getElementById('report-label-photos') as HTMLInputElement | null)?.value).toBe(
      'Photos',
    )
    expect(DEFAULT_REPORT_SCHEMA).toHaveLength(4)
  })

  it('lets two types keep different schemas', () => {
    const sunday: ReportField[] = [...DEFAULT_REPORT_SCHEMA]
    const cell: ReportField[] = [
      { id: 'notes', kind: 'longText', label: 'Cell notes', required: true },
    ]

    const { unmount } = render(<Harness initialRequires initialSchema={sunday} />)
    expect(screen.getByDisplayValue('What was taught')).toBeTruthy()
    unmount()

    render(<Harness initialRequires initialSchema={cell} />)
    expect(screen.getByDisplayValue('Cell notes')).toBeTruthy()
    expect(screen.queryByDisplayValue('What was taught')).toBeNull()
  })
})
