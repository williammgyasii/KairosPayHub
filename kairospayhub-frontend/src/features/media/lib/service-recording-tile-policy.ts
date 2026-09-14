import type { ServiceRecordingStatus } from '@/features/media/api'
import type { ServiceRecordingUploadJob } from '@/features/media/lib/service-recording-upload-queue'

export type ServiceRecordingTileOverlay =
  | 'uploading'
  | 'encoding'
  | 'awaiting-upload'
  | 'failed'
  | null

export function serviceRecordingTileOverlay(
  status: ServiceRecordingStatus,
  uploadJob?: ServiceRecordingUploadJob,
): ServiceRecordingTileOverlay {
  if (uploadJob?.status === 'uploading' || uploadJob?.status === 'queued') {
    return 'uploading'
  }
  if (status === 'Failed') {
    return 'failed'
  }
  if (status === 'Processing') {
    return 'encoding'
  }
  if (status === 'Draft') {
    if (uploadJob?.status === 'completed') {
      return 'encoding'
    }
    return 'awaiting-upload'
  }
  return null
}

export function serviceRecordingTileShowsPlay(status: ServiceRecordingStatus): boolean {
  return status === 'Ready'
}
