import { describe, expect, it } from 'vitest'
import {
  TABLE_PREFERENCE_KEYS,
  mergeColumnVisibility,
  takeBrowserMapOnce,
} from '@/lib/table-preferences'

describe('mergeColumnVisibility', () => {
  const defaults = { name: true, email: true, state: false }

  it('uses defaults when the key was never saved', () => {
    expect(mergeColumnVisibility(defaults, undefined, ['name'])).toEqual(defaults)
  })

  it('overlays saved ids on defaults', () => {
    expect(mergeColumnVisibility(defaults, { email: false }, ['name'])).toEqual({
      name: true,
      email: false,
      state: false,
    })
  })

  it('keeps a new default column when the saved map never mentioned it', () => {
    const olderSave = { email: false }
    const withAge = { ...defaults, age: false }
    expect(mergeColumnVisibility(withAge, olderSave, ['name'])).toEqual({
      name: true,
      email: false,
      state: false,
      age: false,
    })
  })

  it('ignores saved ids the table no longer has', () => {
    expect(mergeColumnVisibility(defaults, { email: false, retired: true }, ['name'])).toEqual({
      name: true,
      email: false,
      state: false,
    })
  })
})

describe('takeBrowserMapOnce', () => {
  it('promotes browser storage when there is no saved row', () => {
    const storage = {
      store: { [TABLE_PREFERENCE_KEYS.givingOverall]: JSON.stringify({ name: true, amount: false }) } as Record<
        string,
        string
      >,
      getItem(key: string) {
        return this.store[key] ?? null
      },
      removeItem(key: string) {
        delete this.store[key]
      },
    }

    const first = takeBrowserMapOnce(undefined, storage, TABLE_PREFERENCE_KEYS.givingOverall)
    expect(first.shouldPromote).toBe(true)
    expect(first.overlay).toEqual({ name: true, amount: false })
    expect(storage.store[TABLE_PREFERENCE_KEYS.givingOverall]).toBeUndefined()

    const second = takeBrowserMapOnce({ name: true }, storage, TABLE_PREFERENCE_KEYS.givingOverall)
    expect(second.shouldPromote).toBe(false)
    expect(second.overlay).toEqual({ name: true })
  })
})
