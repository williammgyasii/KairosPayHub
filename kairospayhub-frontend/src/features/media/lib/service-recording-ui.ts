import type { ServiceRecordingStatus } from '@/features/media/api'

export function serviceRecordingStatusLabel(status: ServiceRecordingStatus): string {
  switch (status) {
    case 'Draft':
      return 'Draft'
    case 'Processing':
      return 'Processing'
    case 'Ready':
      return 'Ready'
    case 'Failed':
      return 'Failed'
    default:
      return status
  }
}

export function formatServiceRecordingDuration(seconds?: number | null): string | null {
  if (seconds == null || seconds <= 0) return null
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes} min`
}

export function formatServiceRecordingViewCount(count?: number | null): string {
  const value = count ?? 0
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M views`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1).replace(/\.0$/, '')}K views`
  return `${value.toLocaleString()} ${value === 1 ? 'view' : 'views'}`
}

export function serviceRecordingPublishLabel(
  publishedAt?: string | null,
): 'Published' | 'Unpublished' {
  return publishedAt ? 'Published' : 'Unpublished'
}

export function formatServiceRecordingDate(iso?: string | null): string | null {
  if (!iso) return null
  const date = iso.slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null
  const [year, month, day] = date.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
