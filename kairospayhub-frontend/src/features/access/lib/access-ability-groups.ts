import type { AccessAbilityColumn, AccessCell } from '@/features/access/api'
import { PRODUCT_ABILITIES } from '@/shared/lib/abilities'

export type AccessAbilityGroupId = 'units' | 'roster' | 'records' | 'other'

export type AccessAbilityGroupDef = {
  id: Exclude<AccessAbilityGroupId, 'other'>
  label: string
  abilityIds: readonly string[]
}

export type AccessAbilityGroupView = {
  id: AccessAbilityGroupId
  label: string
  columns: AccessAbilityColumn[]
}

/** Pastor-facing headings. Keys are ability ids — never layer type names. */
export const ACCESS_ABILITY_GROUPS: readonly AccessAbilityGroupDef[] = [
  {
    id: 'units',
    label: 'Units',
    abilityIds: [PRODUCT_ABILITIES.createChildUnits],
  },
  {
    id: 'roster',
    label: 'Roster',
    abilityIds: [PRODUCT_ABILITIES.manageRoster],
  },
  {
    id: 'records',
    label: 'Records',
    abilityIds: [
      PRODUCT_ABILITIES.viewMemberGivings,
      PRODUCT_ABILITIES.logGiving,
      PRODUCT_ABILITIES.approveGiving,
      PRODUCT_ABILITIES.viewOverallGivings,
      PRODUCT_ABILITIES.createCampaign,
      PRODUCT_ABILITIES.createSubCampaign,
    ],
  },
]

export function groupAccessColumns(columns: AccessAbilityColumn[]): AccessAbilityGroupView[] {
  const byId = new Map(columns.map((column) => [column.id, column]))
  const grouped: AccessAbilityGroupView[] = []

  for (const group of ACCESS_ABILITY_GROUPS) {
    const present = group.abilityIds
      .map((id) => byId.get(id))
      .filter((column): column is AccessAbilityColumn => Boolean(column))
    if (present.length > 0) {
      grouped.push({ id: group.id, label: group.label, columns: present })
    }
  }

  const known = new Set(ACCESS_ABILITY_GROUPS.flatMap((group) => group.abilityIds))
  const extra = columns.filter((column) => !known.has(column.id))
  if (extra.length > 0) {
    grouped.push({ id: 'other', label: 'Other', columns: extra })
  }

  return grouped
}

export function flattenGroupedColumns(groups: AccessAbilityGroupView[]): AccessAbilityColumn[] {
  return groups.flatMap((group) => group.columns)
}

export function orderAccessCells(
  cells: AccessCell[],
  orderedAbilityIds: string[],
): AccessCell[] {
  const byAbility = new Map(cells.map((cell) => [cell.ability, cell]))
  return orderedAbilityIds
    .map((id) => byAbility.get(id))
    .filter((cell): cell is AccessCell => Boolean(cell))
}
