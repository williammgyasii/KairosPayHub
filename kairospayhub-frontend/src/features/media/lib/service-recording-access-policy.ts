import type { ServiceRecordingAccess, ServiceRecordingStatus } from '@/features/media/api'

/** Mirrors API ServiceRecordingPolicy.AccessFor for UI affordances. */
export function serviceRecordingAccessFor(
  canManageChurch: boolean,
  status: ServiceRecordingStatus,
  publishedAt?: string | null,
): ServiceRecordingAccess {
  const visibleToMembers = publishedAt != null && status === 'Ready'
  const canWatchPlayback = status === 'Ready' && (canManageChurch || publishedAt != null)

  return {
    canManage: canManageChurch,
    canPublish: canManageChurch && status === 'Ready' && publishedAt == null,
    canUnpublish: canManageChurch && publishedAt != null,
    canDelete: canManageChurch,
    canWatchPlayback,
    canViewInList: canManageChurch || visibleToMembers,
    canViewDetail: canManageChurch || visibleToMembers,
  }
}
