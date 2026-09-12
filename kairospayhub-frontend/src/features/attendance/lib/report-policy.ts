export const REPORT_FIELD_KINDS = ['longText', 'photos'] as const
export type ReportFieldKind = (typeof REPORT_FIELD_KINDS)[number]

export type ReportField = {
  id: string
  kind: ReportFieldKind
  label: string
  required: boolean
}

export type ReportAnswers = Record<string, string | string[] | undefined>

export type ReportPolicyInput = {
  requiresReport?: boolean
  reportSchema?: ReportField[] | null
}

export const DEFAULT_REPORT_SCHEMA: ReportField[] = [
  { id: 'taught', kind: 'longText', label: 'What was taught', required: true },
  { id: 'shared', kind: 'longText', label: 'What was shared', required: true },
  { id: 'prayer', kind: 'longText', label: 'Prayer / follow-up', required: false },
  { id: 'photos', kind: 'photos', label: 'Photos', required: true },
]

export const MAX_REPORT_PHOTOS = 5

export function seedReportSchema(
  requiresReport: boolean,
  schema?: ReportField[] | null,
): ReportField[] {
  if (!requiresReport) return []
  if (!schema || schema.length === 0) return DEFAULT_REPORT_SCHEMA.map((field) => ({ ...field }))
  return schema.map((field) => ({ ...field }))
}

export function fieldHasAnswer(
  field: ReportField,
  value: string | string[] | undefined,
): boolean {
  if (field.kind === 'photos') {
    return Array.isArray(value) && value.some((url) => typeof url === 'string' && url.trim().length > 0)
  }
  return typeof value === 'string' && value.trim().length > 0
}

export function reportPolicy(type: ReportPolicyInput, answers: ReportAnswers = {}) {
  const required = Boolean(type.requiresReport)
  const fields = seedReportSchema(required, type.reportSchema)
  const complete =
    !required || fields.filter((field) => field.required).every((field) => fieldHasAnswer(field, answers[field.id]))
  return { required, fields, complete }
}

export function markAttendanceWizardSteps(type: ReportPolicyInput) {
  return reportPolicy(type).required ? (['pick', 'mark', 'report'] as const) : (['pick', 'mark'] as const)
}

export function canSubmitAttendanceReport(type: ReportPolicyInput, answers: ReportAnswers) {
  return reportPolicy(type, answers).complete
}

/** Meeting-type form: report schema is a second stage only when the toggle is on. */
export function meetingTypeFormSteps(requiresReport: boolean) {
  return requiresReport ? (['details', 'report'] as const) : (['details'] as const)
}

export function meetingTypeRequiresReportLabel(type: ReportPolicyInput) {
  return reportPolicy(type).required ? 'Yes' : 'No'
}

/** Approval / submission detail: Report is its own pane only when a payload exists. */
export function approvalDetailPanes(hasReport: boolean) {
  return hasReport ? (['rollCall', 'report'] as const) : (['rollCall'] as const)
}

export function newReportField(kind: ReportFieldKind): ReportField {
  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? `field-${crypto.randomUUID()}`
      : `field-${Date.now()}-${kind}`
  return {
    id,
    kind,
    label: kind === 'photos' ? 'Photos' : 'New prompt',
    required: kind === 'photos',
  }
}
