export type ServiceRecordingWatermarkViewer = {
  name: string | null | undefined
  email: string | null | undefined
  id: string | null | undefined
}

export const SERVICE_RECORDING_WATERMARK_SLOT_COUNT = 8
export const SERVICE_RECORDING_WATERMARK_ROTATE_MS = 45_000

export function serviceRecordingWatermarkIdSuffix(
  id: string | null | undefined,
): string | null {
  const trimmed = id?.trim()
  if (!trimmed) return null
  const normalized = trimmed.replace(/-/g, '').toUpperCase()
  const suffix = normalized.slice(-6)
  return suffix.length > 0 ? suffix : null
}

export function buildServiceRecordingWatermarkText(
  viewer: ServiceRecordingWatermarkViewer,
): string {
  const name = viewer.name?.trim()
  const email = viewer.email?.trim()
  const idSuffix = serviceRecordingWatermarkIdSuffix(viewer.id)

  const parts: string[] = []
  if (name) parts.push(name)
  if (email) parts.push(email)
  if (idSuffix) parts.push(`#${idSuffix}`)

  if (parts.length === 0) {
    return 'KairosPayHub · Authorized viewer only'
  }

  return parts.join(' · ')
}

export function serviceRecordingWatermarkPositionIndex(
  tick: number,
  slotCount = SERVICE_RECORDING_WATERMARK_SLOT_COUNT,
): number {
  if (slotCount <= 0) return 0
  const normalizedTick = Number.isFinite(tick) ? Math.floor(tick) : 0
  return ((normalizedTick % slotCount) + slotCount) % slotCount
}

type WatermarkPosition = {
  top?: string
  left?: string
  right?: string
  bottom?: string
  transform?: string
}

const WATERMARK_POSITIONS: WatermarkPosition[] = [
  { top: '8%', left: '6%' },
  { top: '8%', right: '6%' },
  { top: '50%', left: '6%', transform: 'translateY(-50%)' },
  { top: '50%', right: '6%', transform: 'translateY(-50%)' },
  { bottom: '12%', left: '6%' },
  { bottom: '12%', right: '6%' },
  { top: '32%', left: '50%', transform: 'translate(-50%, -50%)' },
  { top: '68%', left: '50%', transform: 'translate(-50%, -50%)' },
]

export function serviceRecordingWatermarkPositionStyle(
  tick: number,
): WatermarkPosition {
  const index = serviceRecordingWatermarkPositionIndex(tick)
  return WATERMARK_POSITIONS[index] ?? WATERMARK_POSITIONS[0]
}
