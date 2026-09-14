import {
  serviceRecordingTileOverlay,
  serviceRecordingTileShowsPlay,
} from '@/features/media/lib/service-recording-tile-policy'
import type { ServiceRecordingUploadJob } from '@/features/media/lib/service-recording-upload-queue'

const baseJob: ServiceRecordingUploadJob = {
  id: 'job-1',
  recordingId: 'rec-1',
  title: 'Sunday Service',
  fileName: 'service.mp4',
  fileSize: 1024,
  status: 'completed',
  progress: { bytesUploaded: 1024, bytesTotal: 1024, percent: 100 },
}

describe('service-recording-tile-policy', () => {
  it('prioritizes active upload overlay', () => {
    expect(
      serviceRecordingTileOverlay('Processing', { ...baseJob, status: 'uploading' }),
    ).toBe('uploading')
  })

  it('shows encoding after upload completes while bunny processes', () => {
    expect(serviceRecordingTileOverlay('Processing', baseJob)).toBe('encoding')
    expect(serviceRecordingTileOverlay('Draft', baseJob)).toBe('encoding')
  })

  it('shows awaiting upload for draft without a finished upload', () => {
    expect(serviceRecordingTileOverlay('Draft')).toBe('awaiting-upload')
  })

  it('only shows play affordance when ready', () => {
    expect(serviceRecordingTileShowsPlay('Ready')).toBe(true)
    expect(serviceRecordingTileShowsPlay('Processing')).toBe(false)
  })
})
