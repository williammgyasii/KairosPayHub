export const TABLE_PREFERENCE_KEYS = {
  units: 'columns.roster.units',
  membership: 'columns.roster.membership',
  attendanceWho: 'columns.attendance.who-showed-up',
  givingOverall: 'columns.giving.overall',
  givingCampaign: 'columns.giving.campaign',
} as const

export type TablePreferenceKey = (typeof TABLE_PREFERENCE_KEYS)[keyof typeof TABLE_PREFERENCE_KEYS]

export type TablePreferenceMaps = Record<string, Record<string, boolean>>

export function mergeColumnVisibility(
  defaults: Record<string, boolean>,
  saved: Record<string, boolean> | undefined,
  alwaysOn: readonly string[] = [],
): Record<string, boolean> {
  const merged = { ...defaults }
  if (saved) {
    for (const [id, visible] of Object.entries(saved)) {
      if (Object.hasOwn(defaults, id)) merged[id] = visible
    }
  }
  for (const id of alwaysOn) merged[id] = true
  return merged
}

export function takeBrowserMapOnce(
  saved: Record<string, boolean> | undefined,
  storage: Pick<Storage, 'getItem' | 'removeItem'> | null,
  storageKey: string,
): { overlay?: Record<string, boolean>; shouldPromote: boolean } {
  if (saved) return { overlay: saved, shouldPromote: false }
  if (!storage) return { shouldPromote: false }

  try {
    const raw = storage.getItem(storageKey)
    if (!raw) return { shouldPromote: false }
    const parsed = JSON.parse(raw) as Record<string, boolean>
    storage.removeItem(storageKey)
    if (!parsed || typeof parsed !== 'object') return { shouldPromote: false }
    return { overlay: parsed, shouldPromote: true }
  } catch {
    try {
      storage.removeItem(storageKey)
    } catch {
      /* ignore */
    }
    return { shouldPromote: false }
  }
}
