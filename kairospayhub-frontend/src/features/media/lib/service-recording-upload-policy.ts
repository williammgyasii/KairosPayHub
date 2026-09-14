export const SERVICE_RECORDING_VIDEO_TYPES = [
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/x-msvideo',
  'video/x-m4v',
] as const

export const MAX_SERVICE_RECORDING_BYTES = 2 * 1024 * 1024 * 1024

export function serviceRecordingVideoAllowed(contentType: string) {
  return (SERVICE_RECORDING_VIDEO_TYPES as readonly string[]).includes(contentType)
}

export function validateServiceRecordingFile(file: File): string | null {
  if (!serviceRecordingVideoAllowed(file.type)) {
    return 'Choose an MP4, MOV, or WebM video file.'
  }
  if (file.size <= 0) {
    return 'The selected file is empty.'
  }
  if (file.size > MAX_SERVICE_RECORDING_BYTES) {
    return 'Video must be 2 GB or smaller.'
  }
  return null
}
