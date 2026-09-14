export type ServiceRecordingsFeatureConfig = {
  enabled: boolean
  allowedChurchIds: string[]
}

export function parseAllowlist(raw: string | undefined | null): string[] {
  if (!raw?.trim()) return []
  return raw
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
}

/** Mirrors API ServiceRecordingFeaturePolicy for nav/tests. */
export function isServiceRecordingsEnabled(
  config: ServiceRecordingsFeatureConfig,
  churchId: string | null | undefined,
): boolean {
  if (config.enabled) return true
  if (!churchId?.trim()) return false
  return config.allowedChurchIds.includes(churchId.trim())
}

/** Prefer server-computed flag from GET /api/me when available. */
export function serviceRecordingsVisible(
  me: { onboarded: boolean; churchId?: string | null; features?: { serviceRecordings?: boolean } },
): boolean {
  if (!me.onboarded) return false
  if (typeof me.features?.serviceRecordings === 'boolean') {
    return me.features.serviceRecordings
  }
  return false
}
