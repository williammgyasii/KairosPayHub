import { serviceRecordingAccessFor } from '@/features/media/lib/service-recording-access-policy'

describe('service-recording-access-policy', () => {
  it('manager can preview ready unpublished playback', () => {
    const access = serviceRecordingAccessFor(true, 'Ready', null)
    expect(access.canWatchPlayback).toBe(true)
    expect(access.canPublish).toBe(true)
  })

  it('member can watch published ready playback only', () => {
    const access = serviceRecordingAccessFor(false, 'Ready', '2026-09-07T12:00:00Z')
    expect(access.canWatchPlayback).toBe(true)
    expect(access.canPublish).toBe(false)
  })

  it('member cannot see draft in list', () => {
    const access = serviceRecordingAccessFor(false, 'Draft', null)
    expect(access.canViewInList).toBe(false)
  })
})
