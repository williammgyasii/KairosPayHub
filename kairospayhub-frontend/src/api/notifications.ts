import type { ApiClient } from './client'

export type NotificationKind =
  | 'SubGivingPendingApproval'
  | 'SubGivingApproved'
  | 'SubGivingRejected'
  | 'ContributionPendingApproval'
  | 'ContributionApproved'
  | 'ContributionRejected'
  | string

export type Notification = {
  id: string
  kind: NotificationKind
  title: string
  body: string
  linkPath: string | null
  programId: string | null
  createdAt: string
  readAt: string | null
}

export type NotificationListResponse = {
  notifications: Notification[]
  unreadCount: number
}

export type NotificationUnreadCountResponse = {
  unreadCount: number
}

export async function listNotifications(
  api: ApiClient,
  options?: { unreadOnly?: boolean; limit?: number },
): Promise<NotificationListResponse> {
  const params = new URLSearchParams()
  if (options?.unreadOnly) params.set('unreadOnly', 'true')
  if (options?.limit) params.set('limit', String(options.limit))
  const query = params.toString()
  return api.get<NotificationListResponse>(`/api/notifications${query ? `?${query}` : ''}`)
}

export async function getUnreadCount(api: ApiClient): Promise<number> {
  const res = await api.get<NotificationUnreadCountResponse>('/api/notifications/unread-count')
  return res.unreadCount
}

export async function markNotificationRead(
  api: ApiClient,
  notificationId: string,
): Promise<Notification> {
  return api.post<Notification>(`/api/notifications/${notificationId}/read`, {})
}

export async function markAllNotificationsRead(api: ApiClient): Promise<number> {
  const res = await api.post<{ markedRead: number }>('/api/notifications/read-all', {})
  return res.markedRead
}
