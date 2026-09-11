import { describe, expect, it } from 'vitest'
import type { StructureLayer, StructureLayerType, StructureNode, StructureTree } from '@/api/structure'
import { unitEditPolicy } from '@/lib/unit-edit-policy'

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

function tree(layers: StructureLayer[], nodes: StructureNode[]): StructureTree {
  return {
    churchId: 'church-1',
    churchName: 'Test Church',
    template: { id: 'tpl-1', name: 'Test', layers },
    nodes,
    members: [],
  }
}

const fellowshipCell = tree(
  [layer('fel', 0, 'Fellowship', 'Fellowship'), layer('cell', 1, 'Cell', 'Cell')],
  [
    node('f1', 'fel', null, 'Titans'),
    node('f2', 'fel', null, 'Alpha'),
    node('c1', 'cell', 'f1', 'Cell A'),
    node('c2', 'cell', 'f2', 'Cell B'),
  ],
)

describe('unitEditPolicy', () => {
  it('gives managers full edit on any unit', () => {
    const policy = unitEditPolicy({
      tree: fellowshipCell,
      canManageChurch: true,
      actorScopeNodeId: null,
      unitId: 'c1',
    })
    expect(policy.canRename).toBe(true)
    expect(policy.canChangeLeader).toBe(true)
    expect(policy.canDelete).toBe(true)
    expect(policy.renameOnly).toBe(false)
  })

  it('allows a scoped leader to rename only their own unit', () => {
    const own = unitEditPolicy({
      tree: fellowshipCell,
      canManageChurch: false,
      hasCreateChildUnits: true,
      actorScopeNodeId: 'f1',
      unitId: 'f1',
    })
    expect(own.canRename).toBe(true)
    expect(own.canChangeLeader).toBe(false)
    expect(own.canDelete).toBe(false)
    expect(own.renameOnly).toBe(true)
  })

  it('lets a scoped leader delete an immediate child in scope', () => {
    const policy = unitEditPolicy({
      tree: fellowshipCell,
      canManageChurch: false,
      hasCreateChildUnits: true,
      actorScopeNodeId: 'f1',
      unitId: 'c1',
    })
    expect(policy.canDelete).toBe(true)
    expect(policy.canRename).toBe(false)
  })

  it('does not let a scoped leader delete a cell outside their fellowship', () => {
    const policy = unitEditPolicy({
      tree: fellowshipCell,
      canManageChurch: false,
      hasCreateChildUnits: true,
      actorScopeNodeId: 'f1',
      unitId: 'c2',
    })
    expect(policy.canDelete).toBe(false)
  })
})
