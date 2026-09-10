import { describe, expect, it } from 'vitest'
import type { StructureLayer, StructureLayerType, StructureNode, StructureTree } from '@/api/structure'
import { createUnitPolicy } from '@/lib/create-unit-policy'

function layer(
  id: string,
  sortOrder: number,
  displayName: string,
  standardType: StructureLayerType,
): StructureLayer {
  return { id, sortOrder, displayName, standardType }
}

function node(
  id: string,
  layerId: string,
  parentNodeId: string | null,
  name: string,
): StructureNode {
  return {
    id,
    layerId,
    parentNodeId,
    name,
    unitNumber: '1',
    leaderMemberId: null,
    leaderName: null,
  }
}

function tree(layers: StructureLayer[], nodes: StructureNode[] = []): StructureTree {
  return {
    churchId: 'church-1',
    churchName: 'Test Church',
    template: { id: 'tpl-1', name: 'Test', layers },
    nodes,
    members: [],
  }
}

const churchCell = {
  cell: layer('cell', 0, 'Cell', 'Cell'),
}

const fellowshipCell = {
  fellowship: layer('fel', 0, 'Fellowship', 'Fellowship'),
  cell: layer('cell', 1, 'Cell', 'Cell'),
}

const pfccFellowshipCell = {
  pfcc: layer('pfcc', 0, 'PFCC', 'PFCC'),
  fellowship: layer('fel', 1, 'Fellowship', 'Fellowship'),
  cell: layer('cell', 2, 'Cell', 'Cell'),
}

describe('createUnitPolicy — Church → Cell', () => {
  const layers = [churchCell.cell]

  it('does not require a parent and skips the first-child step', () => {
    const policy = createUnitPolicy(tree(layers), churchCell.cell)

    expect(policy.canAdd).toBe(true)
    expect(policy.blockedReason).toBeNull()
    expect(policy.parentRequired).toBe(false)
    expect(policy.parentOptions).toEqual([])
    expect(policy.defaultParentId).toBeNull()
    expect(policy.includeFirstChildStep).toBe(false)
  })

  it('uses the layer display name in labels, not the standard type', () => {
    const homeGroup = layer('cell', 0, 'Home group', 'Cell')
    const policy = createUnitPolicy(tree([homeGroup]), homeGroup)

    expect(policy.labels.layerName).toBe('Home group')
    expect(policy.labels.title).toBe('Add home group')
    expect(policy.labels.submitLabel).toBe('Create home group')
    expect(policy.includeFirstChildStep).toBe(false)
  })
})

describe('createUnitPolicy — Fellowship → Cell', () => {
  const layers = [fellowshipCell.fellowship, fellowshipCell.cell]

  it('includes the first-child step when creating a fellowship', () => {
    const policy = createUnitPolicy(tree(layers), fellowshipCell.fellowship)

    expect(policy.canAdd).toBe(true)
    expect(policy.parentRequired).toBe(false)
    expect(policy.includeFirstChildStep).toBe(true)
    expect(policy.labels.layerName).toBe('Fellowship')
    expect(policy.labels.deepestLayerName).toBe('Cell')
    expect(policy.labels.firstChildStepLabel).toBe('First cell')
  })

  it('requires a parent and skips first-child when creating a cell', () => {
    const withFellowship = tree(layers, [
      node('f1', 'fel', null, 'Titans Fellowship'),
    ])
    const policy = createUnitPolicy(withFellowship, fellowshipCell.cell)

    expect(policy.canAdd).toBe(true)
    expect(policy.parentRequired).toBe(true)
    expect(policy.parentOptions).toEqual([{ id: 'f1', label: 'Titans Fellowship' }])
    expect(policy.defaultParentId).toBe('f1')
    expect(policy.includeFirstChildStep).toBe(false)
  })

  it('blocks add when the parent layer is empty and names that layer', () => {
    const policy = createUnitPolicy(tree(layers), fellowshipCell.cell)

    expect(policy.canAdd).toBe(false)
    expect(policy.blockedReason).toMatch(/fellowship/i)
    expect(policy.parentRequired).toBe(true)
    expect(policy.parentOptions).toEqual([])
  })

  it('pins the parent when scoped to a fellowship unit', () => {
    const scoped = tree(layers, [
      node('f1', 'fel', null, 'Titans Fellowship'),
      node('f2', 'fel', null, 'Alpha Fellowship'),
    ])
    const policy = createUnitPolicy(scoped, fellowshipCell.cell, 'f1')

    expect(policy.canAdd).toBe(true)
    expect(policy.parentOptions).toEqual([{ id: 'f1', label: 'Titans Fellowship' }])
    expect(policy.defaultParentId).toBe('f1')
  })
})

describe('createUnitPolicy — PFCC → Fellowship → Cell', () => {
  const layers = [
    pfccFellowshipCell.pfcc,
    pfccFellowshipCell.fellowship,
    pfccFellowshipCell.cell,
  ]

  it('treats PFCC as a mid-layer create with a first-child step', () => {
    const policy = createUnitPolicy(tree(layers), pfccFellowshipCell.pfcc)

    expect(policy.canAdd).toBe(true)
    expect(policy.parentRequired).toBe(false)
    expect(policy.includeFirstChildStep).toBe(true)
    expect(policy.labels.deepestLayerName).toBe('Cell')
  })

  it('requires a PFCC parent when creating a fellowship', () => {
    const withPfcc = tree(layers, [node('p1', 'pfcc', null, 'North PFCC')])
    const policy = createUnitPolicy(withPfcc, pfccFellowshipCell.fellowship)

    expect(policy.canAdd).toBe(true)
    expect(policy.parentRequired).toBe(true)
    expect(policy.parentOptions).toEqual([{ id: 'p1', label: 'North PFCC' }])
    expect(policy.includeFirstChildStep).toBe(true)
    expect(policy.labels.parentLayerName).toBe('PFCC')
  })

  it('blocks fellowship add until a PFCC exists', () => {
    const policy = createUnitPolicy(tree(layers), pfccFellowshipCell.fellowship)

    expect(policy.canAdd).toBe(false)
    expect(policy.blockedReason).toMatch(/pfcc/i)
  })
})
