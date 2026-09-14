export type ServiceRecordingStatusChanged = {
  recordingId: string
  status: string
  churchId: string
}

function readString(raw: Record<string, unknown>, camel: string, pascal: string): string {
  const value = raw[camel] ?? raw[pascal]
  return value == null ? '' : String(value)
}

export function normalizeServiceRecordingStatusChanged(
  raw: unknown,
): ServiceRecordingStatusChanged | null {
  if (!raw || typeof raw !== 'object') return null

  const record = raw as Record<string, unknown>
  const recordingId = readString(record, 'recordingId', 'RecordingId')
  const status = readString(record, 'status', 'Status')
  const churchId = readString(record, 'churchId', 'ChurchId')

  if (!recordingId || !status || !churchId) return null

  return { recordingId, status, churchId }
}
