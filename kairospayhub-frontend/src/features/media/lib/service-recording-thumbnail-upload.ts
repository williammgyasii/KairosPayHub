import { apiBaseUrl } from '@/shared/api/api-base'
import { getAccessToken } from '@/auth/client'

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_BYTES = 5 * 1024 * 1024

export function validateServiceRecordingThumbnailFile(file: File): string | null {
  if (!ALLOWED_TYPES.has(file.type)) {
    return 'Cover image must be JPEG, PNG, or WebP.'
  }
  if (file.size <= 0 || file.size > MAX_BYTES) {
    return 'Cover image must be 5 MB or smaller.'
  }
  return null
}

export async function uploadServiceRecordingThumbnail(
  recordingId: string,
  file: File,
): Promise<string> {
  const error = validateServiceRecordingThumbnailFile(file)
  if (error) throw new Error(error)

  const body = new FormData()
  body.append('file', file)

  const token = getAccessToken()
  const res = await fetch(`${apiBaseUrl()}/api/service-recordings/${recordingId}/thumbnail`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body,
  })

  const data = (await res.json().catch(() => ({}))) as { thumbnailUrl?: string; error?: string }
  if (!res.ok) {
    throw new Error(data.error ?? 'Thumbnail upload failed')
  }
  if (!data.thumbnailUrl) {
    throw new Error('Thumbnail upload failed')
  }
  return data.thumbnailUrl
}
