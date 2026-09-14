import {
  loadPersistedUploadJobs,
  persistUploadJobs,
} from '@/features/media/lib/service-recording-upload-persistence'
import type { ServiceRecordingUploadJob } from '@/features/media/lib/service-recording-upload-queue'

const job: ServiceRecordingUploadJob = {
  id: 'job-1',
  recordingId: 'rec-1',
  title: 'Sunday Service',
  fileName: 'service.mp4',
  fileSize: 1024,
  status: 'uploading',
  progress: { bytesUploaded: 512, bytesTotal: 1024, percent: 50 },
}

describe('service-recording-upload-persistence', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('persists and restores upload jobs', () => {
    persistUploadJobs([job])
    const restored = loadPersistedUploadJobs()
    expect(restored).toHaveLength(1)
    expect(restored[0]?.title).toBe('Sunday Service')
  })

  it('normalizes uploading jobs to queued on restore', () => {
    persistUploadJobs([job])
    expect(loadPersistedUploadJobs()[0]?.status).toBe('queued')
  })

  it('clears storage when job list is empty', () => {
    persistUploadJobs([job])
    persistUploadJobs([])
    expect(loadPersistedUploadJobs()).toEqual([])
  })
})
