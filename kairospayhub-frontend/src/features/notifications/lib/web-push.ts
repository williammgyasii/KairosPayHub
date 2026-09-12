import type { ApiClient } from '@/shared/api/client'

export type EnablePushResult = 'enabled' | 'denied' | 'unavailable' | 'needsSecondClick'

export async function enableWebPush(deps: {
  api: ApiClient
  requestPermission: () => Promise<NotificationPermission>
  subscribe: (publicKey: string) => Promise<{ endpoint: string; p256dh: string; auth: string }>
  supported?: () => boolean
  currentPermission?: () => NotificationPermission
  publicKey?: string
  stopAfterGrant?: () => boolean
  onRequestingPermission?: () => void
  onSubscribing?: () => void
}): Promise<EnablePushResult> {
  if (deps.supported && !deps.supported()) return 'unavailable'

  const existing = deps.currentPermission?.()
  if (existing === 'denied') return 'denied'

  if (existing !== 'granted') {
    deps.onRequestingPermission?.()
    const permission = await deps.requestPermission()
    if (permission !== 'granted') return 'denied'
    if (deps.stopAfterGrant?.()) return 'needsSecondClick'
  }

  deps.onSubscribing?.()
  const publicKey =
    deps.publicKey ?? (await deps.api.get<{ publicKey: string }>('/api/notifications/push/vapid-key')).publicKey
  const sub = await deps.subscribe(publicKey)
  await deps.api.put('/api/notifications/push/subscriptions', {
    endpoint: sub.endpoint,
    p256dh: sub.p256dh,
    auth: sub.auth,
    userAgent: typeof navigator === 'undefined' ? undefined : navigator.userAgent,
  })
  return 'enabled'
}

export async function disableWebPush(deps: {
  api: ApiClient
  currentEndpoint: () => Promise<string | null>
  unsubscribe: () => Promise<void>
}): Promise<void> {
  const endpoint = await deps.currentEndpoint()
  if (endpoint) {
    await deps.api.delete(
      `/api/notifications/push/subscriptions?endpoint=${encodeURIComponent(endpoint)}`,
    )
  }
  await deps.unsubscribe()
}
