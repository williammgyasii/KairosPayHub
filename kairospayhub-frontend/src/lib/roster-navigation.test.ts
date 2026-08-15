import { describe, expect, it } from 'vitest'
import type { StructureTree } from '@/api/structure'
import { directChildLayer, layersBelowScopeRoot, rosterLayersForScope } from '@/lib/structure-tree'
import { rosterUnitLayerUrl, rosterUnitMembersUrl, rosterUnitViewLayerLabel } from '@/lib/roster-navigation'

const tree: StructureTree = {
  churchId: 'church-1',
  churchName: 'Test Church',
  template: {
    id: 'template-1',
    name: 'Standard',
    layers: [
      { id: 'group', sortOrder: 0, standardType: 'Group', displayName: 'Bible Study' },
      { id: 'pfcc', sortOrder: 1, standardType: 'PFCC', displayName: 'PFCC' },
      { id: 'fellowship', sortOrder: 2, standardType: 'Fellowship', displayName: 'Fellowship' },
      { id: 'cell', sortOrder: 3, standardType: 'Cell', displayName: 'Cell' },
    ],
  },
  nodes: [
    { id: 'pfcc-1', layerId: 'pfcc', parentNodeId: null, name: 'PFCC 1', unitNumber: '1', leaderMemberId: null, leaderName: null },
    { id: 'cell-1', layerId: 'cell', parentNodeId: 'fellowship-1', name: 'Cell 1', unitNumber: '1', leaderMemberId: null, leaderName: null },
    { id: 'fellowship-1', layerId: 'fellowship', parentNodeId: 'pfcc-1', name: 'Titans', unitNumber: '1', leaderMemberId: null, leaderName: null },
  ],
  members: [],
}

describe('rosterLayersForScope', () => {
  it('shows all layers for church managers', () => {
    expect(rosterLayersForScope(tree, null).map((l) => l.id)).toEqual([
      'group',
      'pfcc',
      'fellowship',
      'cell',
    ])
  })

  it('shows layers below a PFCC scope', () => {
    expect(rosterLayersForScope(tree, 'pfcc-1').map((l) => l.id)).toEqual([
      'fellowship',
      'cell',
    ])
  })

  it('shows only the cell layer for a cell leader scope', () => {
    expect(layersBelowScopeRoot(tree, 'cell-1')).toEqual([])
    expect(rosterLayersForScope(tree, 'cell-1').map((l) => l.id)).toEqual(['cell'])
  })
})

describe('directChildLayer', () => {
  it('returns the next layer below a unit', () => {
    expect(directChildLayer(tree, 'pfcc-1')?.id).toBe('fellowship')
    expect(directChildLayer(tree, 'fellowship-1')?.id).toBe('cell')
    expect(directChildLayer(tree, 'cell-1')).toBeNull()
  })
})

describe('roster navigation urls', () => {
  it('builds member and leader urls', () => {
    expect(rosterUnitMembersUrl('unit-1')).toBe('/roster/units/unit-1?tab=members')
    expect(rosterUnitMembersUrl('unit-1', 'leaders')).toBe('/roster/units/unit-1?tab=members&preset=leaders')
  })

  it('builds layer tab urls and labels', () => {
    expect(rosterUnitLayerUrl('unit-1', 'fellowship')).toBe('/roster/units/unit-1?tab=fellowship')
    expect(rosterUnitViewLayerLabel('Bible Study')).toBe('View bible study')
  })
})
