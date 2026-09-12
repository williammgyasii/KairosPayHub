import { describe, expect, it } from 'vitest'
import {
  DEFAULT_REPORT_SCHEMA,
  canSubmitAttendanceReport,
  markAttendanceWizardSteps,
  approvalDetailPanes,
  meetingTypeFormSteps,
  meetingTypeRequiresReportLabel,
  reportPolicy,
  seedReportSchema,
} from '@/features/attendance/lib/report-policy'

const sunday = {
  requiresReport: true,
  reportSchema: DEFAULT_REPORT_SCHEMA,
}

const cell = {
  requiresReport: true,
  reportSchema: [
    { id: 'notes', kind: 'longText' as const, label: 'Cell notes', required: true },
    { id: 'shots', kind: 'photos' as const, label: 'Meeting photos', required: false },
  ],
}

describe('seedReportSchema', () => {
  it('seeds the default four prompts when the toggle turns on with an empty schema', () => {
    expect(seedReportSchema(true, [])).toEqual(DEFAULT_REPORT_SCHEMA)
    expect(seedReportSchema(true, null).map((field) => field.id)).toEqual([
      'taught',
      'shared',
      'prayer',
      'photos',
    ])
  })

  it('returns no prompts when the type does not require a report', () => {
    expect(seedReportSchema(false, DEFAULT_REPORT_SCHEMA)).toEqual([])
  })
})

describe('reportPolicy', () => {
  it('keeps custom Sunday and Cell schemas distinct', () => {
    expect(reportPolicy(sunday).fields.map((field) => field.id)).toEqual([
      'taught',
      'shared',
      'prayer',
      'photos',
    ])
    expect(reportPolicy(cell).fields.map((field) => field.label)).toEqual([
      'Cell notes',
      'Meeting photos',
    ])
    expect(reportPolicy(sunday).fields).not.toEqual(reportPolicy(cell).fields)
  })

  it('is incomplete when required text is blank or required photos has zero URLs', () => {
    expect(
      reportPolicy(sunday, {
        taught: '  ',
        shared: 'Shared',
        photos: ['https://cdn.example/a.jpg'],
      }).complete,
    ).toBe(false)
    expect(
      reportPolicy(sunday, {
        taught: 'Taught',
        shared: 'Shared',
        photos: [],
      }).complete,
    ).toBe(false)
  })

  it('is complete when every required field is filled', () => {
    expect(
      reportPolicy(sunday, {
        taught: 'Romans 8',
        shared: 'Prayer requests',
        photos: ['https://cdn.example/a.jpg'],
      }).complete,
    ).toBe(true)
  })

  it('marks a no-report type as not required', () => {
    expect(reportPolicy({ requiresReport: false }).required).toBe(false)
    expect(reportPolicy({ requiresReport: false }).complete).toBe(true)
  })
})

describe('wizard helpers', () => {
  it('adds a report step only when the type requires a report', () => {
    expect(markAttendanceWizardSteps(sunday)).toEqual(['pick', 'mark', 'report'])
    expect(markAttendanceWizardSteps({ requiresReport: false })).toEqual(['pick', 'mark'])
  })

  it('adds a report stage on the meeting-type form only when the toggle is on', () => {
    expect(meetingTypeFormSteps(false)).toEqual(['details'])
    expect(meetingTypeFormSteps(true)).toEqual(['details', 'report'])
  })

  it('labels the meeting-types table from requiresReport, not the title', () => {
    expect(meetingTypeRequiresReportLabel(sunday)).toBe('Yes')
    expect(meetingTypeRequiresReportLabel({ requiresReport: false, reportSchema: DEFAULT_REPORT_SCHEMA })).toBe(
      'No',
    )
  })

  it('adds a Report pane only when the sheet has a report', () => {
    expect(approvalDetailPanes(false)).toEqual(['rollCall'])
    expect(approvalDetailPanes(true)).toEqual(['rollCall', 'report'])
  })

  it('blocks submit until the required report is complete', () => {
    expect(canSubmitAttendanceReport(sunday, { taught: 'Taught' })).toBe(false)
    expect(
      canSubmitAttendanceReport(sunday, {
        taught: 'Taught',
        shared: 'Shared',
        photos: ['https://cdn.example/a.jpg'],
      }),
    ).toBe(true)
  })
})
