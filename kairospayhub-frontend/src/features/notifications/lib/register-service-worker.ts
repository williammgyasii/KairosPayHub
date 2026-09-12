export function registerPushServiceWorker() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return Promise.resolve(null)
  }
  return navigator.serviceWorker.register('/sw.js')
}
