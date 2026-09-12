function destinationFromPushPayload(data) {
  const path = data && data.linkPath ? String(data.linkPath).trim() : ''
  if (!path) return '/'
  return path.startsWith('/') ? path : `/${path}`
}

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  event.waitUntil(
    (async () => {
      let title = 'KairosPayHub'
      let body = ''
      let linkPath = null
      try {
        const data = event.data ? event.data.json() : {}
        if (data && data.title) title = String(data.title)
        if (data && data.body) body = String(data.body)
        if (data && data.linkPath) linkPath = data.linkPath
      } catch {
        // userVisibleOnly: still show a banner if the payload cannot be read
      }
      const icon = `${self.location.origin}/icons/icon-192.png`
      await self.registration.showNotification(title, {
        body,
        icon,
        badge: icon,
        data: { linkPath },
      })
    })(),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const dest = destinationFromPushPayload(event.notification.data)
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      for (const client of windows) {
        if ('focus' in client) {
          client.navigate(dest)
          return client.focus()
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(dest)
    }),
  )
})
