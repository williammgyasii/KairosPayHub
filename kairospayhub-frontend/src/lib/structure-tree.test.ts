import { describe, expect, it } from 'vitest'
import type { StructureLayer, StructureTree } from '@/api/structure'
import {
  formatCellName,
  formatFellowshipName,
  isRosterLayerUnlocked,
  isUnitChildLayerUnlocked,
  layerParentOptions,
  rosterLayerLockReason,
} from '@/lib/structure-tree'

function layer(id: string, sortOrder: number, displayName: string): StructureLayer {
  return {
    id,
    displayName,
    standardType: sortOrder === 0 ? 'Group' : sortOrder === 1 ? 'PFCC' : 'Fellowship',
    sortOrder,
  }
}

function treeWithLayers(layers: StructureLayer[], nodes: StructureTree['nodes'] = []): StructureTree {
  return {
    template: { layers },
    nodes,
    members: [],
  }
}

describe('roster layer locks', () => {
  const group = layer('g', 0, 'Group')
  const pfcc = layer('p', 1, 'PFCC')
  const fellowship = layer('f', 2, 'Fellowship')
  const layers = [group, pfcc, fellowship]

  it('unlocks the top layer always', () => {
    const tree = treeWithLayers(layers)
    expect(isRosterLayerUnlocked(tree, group)).toBe(true)
  })

  it('locks lower layers until the parent layer has units', () => {
    const empty = treeWithLayers(layers)
    expect(isRosterLayerUnlocked(empty, pfcc)).toBe(false)
    expect(isRosterLayerUnlocked(empty, fellowship)).toBe(false)
    expect(rosterLayerLockReason(empty, pfcc)).toBe('Add a group first')

    const withGroup = treeWithLayers(layers, [
      { id: 'g1', layerId: 'g', parentNodeId: null, name: 'North Group', unitNumber: '1' },
    ])
    expect(isRosterLayerUnlocked(withGroup, pfcc)).toBe(true)
    expect(isRosterLayerUnlocked(withGroup, fellowship)).toBe(false)
  })
})

describe('unit child layer locks', () => {
  const group = layer('g', 0, 'Group')
  const pfcc = layer('p', 1, 'PFCC')
  const fellowship = layer('f', 2, 'Fellowship')
  const layers = [group, pfcc, fellowship]

  it('unlocks the first child layer under a unit', () => {
    const tree = treeWithLayers(layers, [
      { id: 'g1', layerId: 'g', parentNodeId: null, name: 'North Group', unitNumber: '1' },
    ])
    expect(isUnitChildLayerUnlocked(tree, 'g1', pfcc)).toBe(true)
  })

  it('locks deeper child layers until the previous layer has units under the unit', () => {
    const tree = treeWithLayers(layers, [
      { id: 'g1', layerId: 'g', parentNodeId: null, name: 'North Group', unitNumber: '1' },
    ])
    expect(isUnitChildLayerUnlocked(tree, 'g1', fellowship)).toBe(false)

    const withPfcc = treeWithLayers(layers, [
      { id: 'g1', layerId: 'g', parentNodeId: null, name: 'North Group', unitNumber: '1' },
      { id: 'p1', layerId: 'p', parentNodeId: 'g1', name: 'PFCC 1', unitNumber: '1' },
    ])
    expect(isUnitChildLayerUnlocked(withPfcc, 'g1', fellowship)).toBe(true)
  })
})

describe('layer parent options', () => {
  const group = layer('g', 0, 'Group')
  const pfcc = layer('p', 1, 'PFCC')
  const fellowship = layer('f', 2, 'Fellowship')
  const layers = [group, pfcc, fellowship]

  it('lists PFCC parents church-wide for fellowship', () => {
    const tree = treeWithLayers(layers, [
      { id: 'g1', layerId: 'g', parentNodeId: null, name: 'North Group', unitNumber: '1' },
      { id: 'p1', layerId: 'p', parentNodeId: 'g1', name: 'PFCC 1', unitNumber: '1' },
    ])
    expect(layerParentOptions(tree, fellowship)).toEqual([{ id: 'p1', label: 'PFCC 1' }])
  })

  it('uses the current unit when fellowship is a direct child', () => {
    const tree = treeWithLayers(layers, [
      { id: 'p1', layerId: 'p', parentNodeId: 'g1', name: 'PFCC 1', unitNumber: '1' },
    ])
    expect(layerParentOptions(tree, fellowship, 'p1')).toEqual([{ id: 'p1', label: 'PFCC 1' }])
  })
})

describe('formatFellowshipName', () => {
  it('appends Fellowship when omitted', () => {
    expect(formatFellowshipName('titan')).toBe('Titan Fellowship')
    expect(formatFellowshipName('  titans  ')).toBe('Titans Fellowship')
  })

  it('keeps names that already end with fellowship', () => {
    expect(formatFellowshipName('titans fellowship')).toBe('Titans Fellowship')
    expect(formatFellowshipName('Titans Fellowship')).toBe('Titans Fellowship')
  })
})

describe('formatCellName', () => {
  it('appends Cell when omitted', () => {
    expect(formatCellName('titans')).toBe('Titans Cell')
    expect(formatCellName('  alpha  ')).toBe('Alpha Cell')
  })

  it('keeps names that already end with cell', () => {
    expect(formatCellName('titans cell')).toBe('Titans Cell')
    expect(formatCellName('Titans Cell')).toBe('Titans Cell')
  })
})
