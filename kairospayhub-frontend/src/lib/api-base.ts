const DEFAULT_API_URL = 'http://localhost:5192'

export function apiBaseUrl(): string {
  const url = import.meta.env.VITE_API_URL ?? DEFAULT_API_URL
  return url.replace(/\/+$/, '')
}
