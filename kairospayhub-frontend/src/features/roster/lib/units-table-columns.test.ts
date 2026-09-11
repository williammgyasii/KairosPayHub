import { describe, expect, it } from 'vitest'
import {
  UNITS_ALWAYS_VISIBLE_COLUMN_IDS,
  UNITS_TOGGLEABLE_COLUMN_IDS,
  defaultUnitsColumnVisibility,
  mergeUnitsColumnVisibility,
  unitsColumnLabel,
} from '@/features/roster/lib/units-table-columns'

describe('units-table-columns', () => {
  it('defaults Name, Parent, and Members on; Name is always on', () => {
    const visibility = defaultUnitsColumnVisibility()

    expect(visibility.name).toBe(true)
    expect(visibility.parent).toBe(true)
    expect(visibility.memberCount).toBe(true)
    expect(UNITS_ALWAYS_VISIBLE_COLUMN_IDS).toContain('name')
    expect(UNITS_TOGGLEABLE_COLUMN_IDS).toEqual(['parent', 'memberCount'])
    expect(unitsColumnLabel('parent')).toBe('Parent')
    expect(unitsColumnLabel('memberCount')).toBe('Members')
  })

  it('merge hides Parent but cannot turn Name off', () => {
    const merged = mergeUnitsColumnVisibility(defaultUnitsColumnVisibility(), {
      name: false,
      parent: false,
    })

    expect(merged.name).toBe(true)
    expect(merged.parent).toBe(false)
    expect(merged.memberCount).toBe(true)
  })
})
