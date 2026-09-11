import { useEffect, useMemo, useRef, useState } from 'react'
import type { VisibilityState } from '@tanstack/react-table'
import {
  mergeColumnVisibility,
  takeBrowserMapOnce,
  type TablePreferenceKey,
} from '@/lib/table-preferences'
import { useGetTablePreferencesQuery, usePutTablePreferenceMutation } from '@/store/meApi'

const PUT_DEBOUNCE_MS = 300

export function usePersistedColumnVisibility(
  key: TablePreferenceKey,
  defaults: Record<string, boolean>,
  options?: {
    alwaysOn?: readonly string[]
    migrateStorageKey?: string
  },
): [VisibilityState, (next: VisibilityState) => void] {
  const alwaysOn = options?.alwaysOn ?? []
  const { data } = useGetTablePreferencesQuery()
  const [putPreference] = usePutTablePreferenceMutation()
  const saved = data?.preferences?.[key]
  const defaultsKey = JSON.stringify(defaults)
  const alwaysOnKey = alwaysOn.join('|')

  const migrated = useMemo(() => {
    if (!options?.migrateStorageKey) return { overlay: saved, shouldPromote: false as const }
    const storage = typeof localStorage !== 'undefined' ? localStorage : null
    return takeBrowserMapOnce(saved, storage, options.migrateStorageKey)
  }, [options?.migrateStorageKey, saved])

  const merged = useMemo(
    () => mergeColumnVisibility(JSON.parse(defaultsKey) as Record<string, boolean>, migrated.overlay, alwaysOn),
    // alwaysOnKey captures the locked ids
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [alwaysOnKey, defaultsKey, migrated.overlay],
  )

  const [visibility, setVisibility] = useState<VisibilityState>(merged)

  useEffect(() => {
    setVisibility(merged)
  }, [merged])

  const promotedKey = useRef<string | null>(null)
  useEffect(() => {
    if (!migrated.shouldPromote || !migrated.overlay) return
    if (promotedKey.current === key) return
    promotedKey.current = key
    void putPreference({ key, columns: merged })
  }, [key, merged, migrated.overlay, migrated.shouldPromote, putPreference])

  const timer = useRef<number | null>(null)
  const persist = (next: VisibilityState) => {
    const sanitized = mergeColumnVisibility(
      JSON.parse(defaultsKey) as Record<string, boolean>,
      next,
      alwaysOn,
    )
    setVisibility(sanitized)
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      void putPreference({ key, columns: sanitized })
    }, PUT_DEBOUNCE_MS)
  }

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current)
    },
    [],
  )

  return [visibility, persist]
}
