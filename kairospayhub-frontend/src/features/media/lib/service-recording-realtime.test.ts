import { describe, expect, it } from 'vitest'
import { normalizeServiceRecordingStatusChanged } from './service-recording-realtime'

describe('normalizeServiceRecordingStatusChanged', () => {
  it('accepts camelCase payload from SignalR', () => {
    expect(
      normalizeServiceRecordingStatusChanged({
        recordingId: 'rec-1',
        status: 'Ready',
        churchId: 'church-1',
      }),
    ).toEqual({
      recordingId: 'rec-1',
      status: 'Ready',
      churchId: 'church-1',
    })
  })

  it('accepts PascalCase payload', () => {
    expect(
      normalizeServiceRecordingStatusChanged({
        RecordingId: 'rec-2',
        Status: 'Failed',
        ChurchId: 'church-2',
      }),
    ).toEqual({
      recordingId: 'rec-2',
      status: 'Failed',
      churchId: 'church-2',
    })
  })

  it('returns null when required fields are missing', () => {
    expect(normalizeServiceRecordingStatusChanged(null)).toBeNull()
    expect(normalizeServiceRecordingStatusChanged({ recordingId: 'x' })).toBeNull()
  })
})
