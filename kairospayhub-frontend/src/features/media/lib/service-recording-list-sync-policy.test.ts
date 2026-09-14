import {
  serviceRecordingListHasInFlight,
  serviceRecordingListPollingIntervalMs,
  SERVICE_RECORDING_DEV_POLL_MS,
} from '@/features/media/lib/service-recording-list-sync-policy'

describe('service-recording-list-sync-policy', () => {
  it('polls in dev while recordings are in flight', () => {
    expect(
      serviceRecordingListPollingIntervalMs(true, true),
    ).toBe(SERVICE_RECORDING_DEV_POLL_MS)
  })

  it('does not poll in production', () => {
    expect(serviceRecordingListPollingIntervalMs(true, false)).toBe(0)
  })

  it('does not poll when nothing is in flight', () => {
    expect(serviceRecordingListPollingIntervalMs(false, true)).toBe(0)
  })

  it('detects draft and processing recordings', () => {
    expect(serviceRecordingListHasInFlight([{ status: 'Ready' }])).toBe(false)
    expect(serviceRecordingListHasInFlight([{ status: 'Processing' }])).toBe(true)
  })
})
