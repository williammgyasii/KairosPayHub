const DEFAULT_API_URL = 'http://localhost:5192'

export function apiBaseUrl(): string {
  const configured = import.meta.env.VITE_API_URL?.trim()
  if (configured) {
    return configured.replace(/\/+$/, '')
  }

  if (import.meta.env.PROD && typeof window !== 'undefined') {
    return window.location.origin
  }

  return DEFAULT_API_URL
}
