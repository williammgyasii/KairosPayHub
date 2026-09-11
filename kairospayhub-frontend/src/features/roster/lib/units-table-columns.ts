/** Column visibility policy for Roster → Units (stable ids, not layer-type gates). */

export type UnitsColumnId = 'name' | 'parent' | 'memberCount'

export const UNITS_ALWAYS_VISIBLE_COLUMN_IDS = ['name'] as const

export const UNITS_TOGGLEABLE_COLUMN_IDS: UnitsColumnId[] = ['parent', 'memberCount']

export const UNITS_COLUMN_LABELS: Record<UnitsColumnId, string> = {
  name: 'Name',
  parent: 'Parent',
  memberCount: 'Members',
}

export function defaultUnitsColumnVisibility(): Record<string, boolean> {
  return {
    name: true,
    parent: true,
    memberCount: true,
    actions: true,
  }
}

export function unitsColumnLabel(columnId: string): string {
  return UNITS_COLUMN_LABELS[columnId as UnitsColumnId] ?? columnId
}

export function mergeUnitsColumnVisibility(
  current: Record<string, boolean>,
  patch: Record<string, boolean>,
): Record<string, boolean> {
  return {
    ...current,
    ...patch,
    name: true,
    actions: true,
  }
}
