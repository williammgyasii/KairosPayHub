import { describe, expect, it } from 'vitest'
import {
  canPublishMeetingPack,
  leaderCanContinuePastPack,
  packFileAllowed,
  packIsComplete,
  packReceiptStatus,
} from '@/features/attendance/lib/meeting-pack-policy'

describe('meetingPackPolicy', () => {
  it('is complete with a note or at least one file', () => {
    expect(packIsComplete('Romans 8', 0)).toBe(true)
    expect(packIsComplete('', 1)).toBe(true)
    expect(packIsComplete('  notes  ', 0)).toBe(true)
  })

  it('rejects an empty pack', () => {
    expect(packIsComplete('', 0)).toBe(false)
    expect(packIsComplete('   ', 0)).toBe(false)
    expect(packIsComplete(null, 0)).toBe(false)
  })

  it('allows PDF and images only', () => {
    expect(packFileAllowed('application/pdf')).toBe(true)
    expect(packFileAllowed('image/jpeg')).toBe(true)
    expect(packFileAllowed('video/mp4')).toBe(false)
  })

  it('lets church managers publish, not cell leaders', () => {
    expect(canPublishMeetingPack(true)).toBe(true)
    expect(canPublishMeetingPack(false)).toBe(false)
  })

  it('blocks Continue until a leader downloads a file', () => {
    expect(leaderCanContinuePastPack(null)).toBe(true)
    expect(leaderCanContinuePastPack({ files: [], viewerDownloadedAt: null })).toBe(true)
    expect(
      leaderCanContinuePastPack({
        files: [{ id: 'f1' }],
        viewerDownloadedAt: null,
      }),
    ).toBe(false)
    expect(
      leaderCanContinuePastPack({
        files: [{ id: 'f1' }],
        viewerDownloadedAt: '2026-09-11T12:00:00Z',
      }),
    ).toBe(true)
  })

  it('labels a receipt as downloaded, opened, or not yet', () => {
    expect(packReceiptStatus({ downloadedAt: '2026-09-11T12:00:00Z', seenAt: '2026-09-11T11:00:00Z' })).toBe(
      'Downloaded',
    )
    expect(packReceiptStatus({ seenAt: '2026-09-11T11:00:00Z', downloadedAt: null })).toBe('Opened')
    expect(packReceiptStatus({ seenAt: null, downloadedAt: null })).toBe('Not yet')
  })
})
