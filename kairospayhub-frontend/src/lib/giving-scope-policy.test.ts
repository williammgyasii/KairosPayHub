import { describe, expect, it } from 'vitest'
import type { StructureLayer, StructureLayerType, StructureNode, StructureTree } from '@/api/structure'
import { givingScopePolicy, leadershipFromProfile } from '@/lib/giving-scope-policy'

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

const fellowshipCell = {
  fellowship: layer('fel', 0, 'Fellowship', 'Fellowship'),
  cell: layer('cell', 1, 'Cell', 'Cell'),
}

const pfccFellowshipCell = {
  pfcc: layer('pfcc', 0, 'PFCC', 'PFCC'),
  fellowship: layer('fel', 1, 'Fellowship', 'Fellowship'),
  cell: layer('cell', 2, 'Cell', 'Cell'),
}

describe('leadershipFromProfile', () => {
  it('prefers leadership profile over role name', () => {
    expect(leadershipFromProfile('Intermediate', 'Pastor')).toBe('intermediate')
    expect(leadershipFromProfile('Leaf', 'FellowshipLeader')).toBe('leaf')
  })

  it('falls back to role when profile is missing', () => {
    expect(leadershipFromProfile(null, 'Pastor')).toBe('churchWide')
    expect(leadershipFromProfile(undefined, 'CellLeader')).toBe('leaf')
  })
})

describe('givingScopePolicy — Fellowship → Cell', () => {
  const layers = [fellowshipCell.fellowship, fellowshipCell.cell]
  const nodes = [
    node('f1', 'fel', null, 'Titans'),
    node('c1', 'cell', 'f1', 'Cell 1'),
  ]
  const t = tree(layers, nodes)

  it('offers Fellowship and Cell with displayName labels, never PFCC', () => {
    const policy = givingScopePolicy({
      tree: t,
      actorLeadership: 'churchWide',
    })

    expect(policy.allowChurchWide).toBe(true)
    expect(policy.layers.map((l) => l.label)).toEqual(['Fellowship', 'Cell'])
    expect(policy.layers.map((l) => l.layerId)).toEqual(['fel', 'cell'])
    expect(policy.layers.some((l) => /pfcc/i.test(l.label))).toBe(false)
  })

  it('lists deepest-layer units for Cell', () => {
    const policy = givingScopePolicy({
      tree: t,
      actorLeadership: 'churchWide',
    })
    expect(policy.unitsForLayer('cell').map((u) => u.id)).toEqual(['c1'])
  })

  it('lets intermediate create and bulk-log; leaf cannot create', () => {
    const intermediate = givingScopePolicy({
      tree: t,
      actorLeadership: 'intermediate',
      actorScopeNodeId: 'f1',
    })
    expect(intermediate.canCreateCampaign).toBe(true)
    expect(intermediate.canCreateSubCampaign).toBe(true)
    expect(intermediate.canBulkLog).toBe(true)
    expect(intermediate.allowChurchWide).toBe(false)

    const leaf = givingScopePolicy({
      tree: t,
      actorLeadership: 'leaf',
      actorScopeNodeId: 'c1',
    })
    expect(leaf.canCreateCampaign).toBe(false)
    expect(leaf.canCreateSubCampaign).toBe(false)
    expect(leaf.canBulkLog).toBe(false)
  })
})

describe('givingScopePolicy — PFCC → Fellowship → Cell', () => {
  const layers = [
    pfccFellowshipCell.pfcc,
    pfccFellowshipCell.fellowship,
    pfccFellowshipCell.cell,
  ]
  const nodes = [
    node('p1', 'pfcc', null, 'PFCC 1'),
    node('f1', 'fel', 'p1', 'Titans'),
    node('c1', 'cell', 'f1', 'Cell 1'),
  ]
  const t = tree(layers, nodes)

  it('offers all three layers plus church-wide for church-wide leadership', () => {
    const policy = givingScopePolicy({
      tree: t,
      actorLeadership: 'churchWide',
    })

    expect(policy.allowChurchWide).toBe(true)
    expect(policy.churchWideLabel).toBe('Church-wide')
    expect(policy.layers.map((l) => l.label)).toEqual(['PFCC', 'Fellowship', 'Cell'])
    expect(policy.canCreateCampaign).toBe(true)
    expect(policy.canCreateSubCampaign).toBe(true)
  })

  it('limits intermediate actor units to their subtree', () => {
    const policy = givingScopePolicy({
      tree: t,
      actorLeadership: 'intermediate',
      actorScopeNodeId: 'f1',
    })

    expect(policy.layers.map((l) => l.layerId)).toEqual(['fel', 'cell'])
    expect(policy.unitsForLayer('fel').map((u) => u.id)).toEqual(['f1'])
    expect(policy.unitsForLayer('cell').map((u) => u.id)).toEqual(['c1'])
  })

  it('constrains sub-campaign layers to the parent subtree', () => {
    const policy = givingScopePolicy({
      tree: t,
      actorLeadership: 'churchWide',
      parent: { scopeKind: 'Fellowship', scopeNodeId: 'f1' },
    })

    expect(policy.allowChurchWide).toBe(false)
    expect(policy.layers.map((l) => l.layerId)).toEqual(['fel', 'cell'])
    expect(policy.unitsForLayer('fel').map((u) => u.id)).toEqual(['f1'])
    expect(policy.unitsForLayer('cell').map((u) => u.id)).toEqual(['c1'])
  })
})
