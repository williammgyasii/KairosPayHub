import { describe, expect, it } from 'vitest'
import {
  formatServiceRecordingViewCount,
  serviceRecordingPublishLabel,
} from '@/features/media/lib/service-recording-ui'

describe('service-recording-ui', () => {
  it('formats view counts', () => {
    expect(formatServiceRecordingViewCount(0)).toBe('0 views')
    expect(formatServiceRecordingViewCount(1)).toBe('1 view')
    expect(formatServiceRecordingViewCount(42)).toBe('42 views')
    expect(formatServiceRecordingViewCount(1500)).toBe('1.5K views')
  })

  it('labels publish state', () => {
    expect(serviceRecordingPublishLabel(null)).toBe('Unpublished')
    expect(serviceRecordingPublishLabel('2026-09-13T00:00:00Z')).toBe('Published')
  })
})
