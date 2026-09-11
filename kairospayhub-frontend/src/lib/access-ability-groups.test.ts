import { describe, expect, it } from 'vitest'
import type { AccessAbilityColumn } from '@/api/access'
import { PRODUCT_ABILITIES } from '@/lib/abilities'
import {
  flattenGroupedColumns,
  groupAccessColumns,
  orderAccessCells,
} from '@/lib/access-ability-groups'

function col(id: string, label = id): AccessAbilityColumn {
  return { id, label }
}

const catalog = [
  col(PRODUCT_ABILITIES.createSubCampaign, 'Create sub-campaign'),
  col(PRODUCT_ABILITIES.manageRoster, 'Manage members'),
  col(PRODUCT_ABILITIES.viewMemberGivings, 'View member givings'),
  col(PRODUCT_ABILITIES.createChildUnits, 'Create child units'),
  col(PRODUCT_ABILITIES.logGiving, 'Log giving'),
  col(PRODUCT_ABILITIES.approveGiving, 'Approve giving'),
  col(PRODUCT_ABILITIES.viewOverallGivings, 'View overall givings'),
  col(PRODUCT_ABILITIES.createCampaign, 'Create campaign'),
]

describe('groupAccessColumns', () => {
  it('puts fats under Units, Roster, and Records regardless of API order', () => {
    const groups = groupAccessColumns(catalog)

    expect(groups.map((group) => group.id)).toEqual(['units', 'roster', 'records'])
    expect(groups[0].columns.map((column) => column.id)).toEqual([PRODUCT_ABILITIES.createChildUnits])
    expect(groups[1].columns.map((column) => column.id)).toEqual([PRODUCT_ABILITIES.manageRoster])
    expect(groups[2].columns.map((column) => column.id)).toEqual([
      PRODUCT_ABILITIES.viewMemberGivings,
      PRODUCT_ABILITIES.logGiving,
      PRODUCT_ABILITIES.approveGiving,
      PRODUCT_ABILITIES.viewOverallGivings,
      PRODUCT_ABILITIES.createCampaign,
      PRODUCT_ABILITIES.createSubCampaign,
    ])
  })

  it('keeps Roster as one column', () => {
    const roster = groupAccessColumns(catalog).find((group) => group.id === 'roster')
    expect(roster?.columns).toHaveLength(1)
  })

  it('parks unknown ability ids in Other so they cannot vanish', () => {
    const groups = groupAccessColumns([...catalog, col('markAttendance', 'Mark attendance')])
    const other = groups.find((group) => group.id === 'other')
    expect(other?.columns.map((column) => column.id)).toEqual(['markAttendance'])
  })
})

describe('orderAccessCells', () => {
  it('follows grouped column order, not the row payload order', () => {
    const groups = groupAccessColumns(catalog)
    const orderedIds = flattenGroupedColumns(groups).map((column) => column.id)
    const cells = orderAccessCells(
      [
        { ability: PRODUCT_ABILITIES.manageRoster, defaultOn: true, effectiveOn: true, locked: false },
        { ability: PRODUCT_ABILITIES.createChildUnits, defaultOn: true, effectiveOn: true, locked: false },
      ],
      orderedIds,
    )

    expect(cells.map((cell) => cell.ability)).toEqual([
      PRODUCT_ABILITIES.createChildUnits,
      PRODUCT_ABILITIES.manageRoster,
    ])
  })
})
