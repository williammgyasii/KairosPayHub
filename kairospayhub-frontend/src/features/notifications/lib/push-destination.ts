export function parsePushEventData(raw: string | null | undefined): {
  title: string
  body: string
  linkPath: string | null
} {
  try {
    const data = raw ? (JSON.parse(raw) as { title?: unknown; body?: unknown; linkPath?: unknown }) : {}
    const title = typeof data.title === 'string' && data.title.trim() ? data.title : 'KairosPayHub'
    const body = typeof data.body === 'string' ? data.body : ''
    const linkPath = typeof data.linkPath === 'string' ? data.linkPath : null
    return { title, body, linkPath }
  } catch {
    return { title: 'KairosPayHub', body: '', linkPath: null }
  }
}

export function destinationFromPushPayload(data: { linkPath?: string | null } | null | undefined): string {
  const path = data?.linkPath?.trim()
  if (!path) return '/'
  return path.startsWith('/') ? path : `/${path}`
}

/** Same mark as the PWA / home-screen icon. SVG favicons do not show on OS banners. */
export const OS_NOTIFICATION_ICON_PATH = '/icons/icon-192.png'

export function osNotificationChrome(origin: string): { icon: string; badge: string } {
  const base = origin.replace(/\/$/, '')
  const icon = `${base}${OS_NOTIFICATION_ICON_PATH}`
  return { icon, badge: icon }
}
