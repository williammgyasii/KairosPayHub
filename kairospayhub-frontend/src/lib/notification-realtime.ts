import type { Notification } from '@/api/notifications'

function readString(raw: Record<string, unknown>, camel: string, pascal: string): string {
  const value = raw[camel] ?? raw[pascal]
  return value == null ? '' : String(value)
}

function readNullableString(
  raw: Record<string, unknown>,
  camel: string,
  pascal: string,
): string | null {
  const value = raw[camel] ?? raw[pascal]
  if (value == null) return null
  return String(value)
}

export function normalizeNotification(raw: unknown): Notification | null {
  if (!raw || typeof raw !== 'object') return null

  const record = raw as Record<string, unknown>
  const id = readString(record, 'id', 'Id')
  if (!id) return null

  return {
    id,
    kind: readString(record, 'kind', 'Kind'),
    title: readString(record, 'title', 'Title'),
    body: readString(record, 'body', 'Body'),
    linkPath: readNullableString(record, 'linkPath', 'LinkPath'),
    programId: readNullableString(record, 'programId', 'ProgramId'),
    createdAt: readString(record, 'createdAt', 'CreatedAt'),
    readAt: readNullableString(record, 'readAt', 'ReadAt'),
  }
}

export const NOTIFICATIONS_LIST_LIMIT = 30
