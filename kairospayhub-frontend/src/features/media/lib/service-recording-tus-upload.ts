import * as tus from 'tus-js-client'
import type { ServiceRecordingTusUpload } from '@/features/media/api'

export type ServiceRecordingUploadProgress = {
  bytesUploaded: number
  bytesTotal: number
  percent: number
}

export function tusUploadFromCreateResult(result: {
  tusEndpoint: string
  tusLibraryId: number
  tusSignature: string
  tusExpiresUnix: number
  bunnyVideoGuid: string
}): ServiceRecordingTusUpload {
  return {
    tusEndpoint: result.tusEndpoint,
    tusLibraryId: result.tusLibraryId,
    tusSignature: result.tusSignature,
    tusExpiresUnix: result.tusExpiresUnix,
    videoId: result.bunnyVideoGuid,
  }
}

export function uploadServiceRecordingWithTus(
  file: File,
  credentials: ServiceRecordingTusUpload,
  recordingId: string,
  onProgress?: (progress: ServiceRecordingUploadProgress) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const upload = new tus.Upload(file, {
      endpoint: credentials.tusEndpoint,
      retryDelays: [0, 3000, 5000, 10_000, 20_000, 60_000],
      chunkSize: 32 * 1024 * 1024,
      fingerprint: async () => `kairospayhub-recording-${recordingId}`,
      headers: {
        AuthorizationSignature: credentials.tusSignature,
        AuthorizationExpire: String(credentials.tusExpiresUnix),
        VideoId: credentials.videoId,
        LibraryId: String(credentials.tusLibraryId),
      },
      metadata: {
        filetype: file.type,
        title: file.name,
      },
      onError: (error) => reject(error),
      onProgress: (bytesUploaded, bytesTotal) => {
        if (!onProgress) return
        const percent =
          bytesTotal > 0 ? Math.min(100, Math.round((bytesUploaded / bytesTotal) * 100)) : 0
        onProgress({ bytesUploaded, bytesTotal, percent })
      },
      onSuccess: () => resolve(),
    })

    upload.findPreviousUploads().then((previous) => {
      if (previous.length > 0) {
        upload.resumeFromPreviousUpload(previous[0]!)
      }
      upload.start()
    })
  })
}

export function formatUploadBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
  }
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(0)} KB`
  }
  return `${bytes} B`
}
