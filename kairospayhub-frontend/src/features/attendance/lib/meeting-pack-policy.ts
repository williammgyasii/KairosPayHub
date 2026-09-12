export const PACK_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'] as const
export type PackFileType = (typeof PACK_FILE_TYPES)[number]

export const MAX_PACK_FILES = 5
export const MAX_PACK_FILE_BYTES = 10 * 1024 * 1024

export function packIsComplete(note?: string | null, fileCount = 0) {
  return Boolean(note?.trim()) || fileCount > 0
}

export function packFileAllowed(contentType: string) {
  return (PACK_FILE_TYPES as readonly string[]).includes(contentType)
}

/** Church managers publish. Leaders only receive. Not a meeting-title gate. */
export function canPublishMeetingPack(canManageChurch: boolean) {
  return canManageChurch
}

export function packReceiptStatus(row: { seenAt?: string | null; downloadedAt?: string | null }) {
  if (row.downloadedAt) return 'Downloaded'
  if (row.seenAt) return 'Opened'
  return 'Not yet'
}

/** Leaders must take a file when the pack has one. Note-only packs do not block roll call. */
export function leaderCanContinuePastPack(pack: {
  files: Array<unknown>
  viewerDownloadedAt?: string | null
} | null) {
  if (!pack) return true
  if (pack.files.length === 0) return true
  return Boolean(pack.viewerDownloadedAt)
}
