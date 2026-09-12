import type { ApiClient } from '@/shared/api/client'
import { registerPushServiceWorker } from './register-service-worker'

export function subscriptionPayload(json: {
  endpoint?: string
  keys?: { p256dh?: string; auth?: string }
}) {
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return null
  return { endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth }
}

/** Packed key bytes — a subarray view can hang Edge/Firefox subscribe. */
export function vapidPublicKeyToBuffer(base64: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'))
  const bytes = Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
}

export function isBrowserPushSupported() {
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  )
}

async function readyRegistration() {
  await registerPushServiceWorker()
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service workers are not available in this browser.')
  }
  return await Promise.race([
    navigator.serviceWorker.ready,
    new Promise<never>((_, reject) => {
      window.setTimeout(() => {
        reject(new Error('Push service worker did not become ready. Refresh and try again.'))
      }, 8000)
    }),
  ])
}

export function browserEnablePushDeps(api: ApiClient) {
  return {
    api,
    supported: isBrowserPushSupported,
    currentPermission: () => Notification.permission,
    requestPermission: () => Notification.requestPermission(),
    subscribe: async (publicKey: string) => {
      const registration = await readyRegistration()
      const existing = await registration.pushManager.getSubscription()
      const reused = subscriptionPayload(existing?.toJSON() ?? {})
      if (reused) return reused

      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: new Uint8Array(vapidPublicKeyToBuffer(publicKey)),
      })
      const payload = subscriptionPayload(sub.toJSON())
      if (!payload) throw new Error('This browser did not return a complete push subscription.')
      return payload
    },
  }
}

export function browserDisablePushDeps(api: ApiClient) {
  return {
    api,
    currentEndpoint: async () => {
      if (!isBrowserPushSupported()) return null
      const registration = await readyRegistration()
      const sub = await registration.pushManager.getSubscription()
      return sub?.endpoint ?? null
    },
    unsubscribe: async () => {
      if (!isBrowserPushSupported()) return
      const registration = await readyRegistration()
      const sub = await registration.pushManager.getSubscription()
      await sub?.unsubscribe()
    },
  }
}
