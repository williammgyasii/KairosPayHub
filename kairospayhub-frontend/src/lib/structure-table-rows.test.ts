import { describe, expect, it } from 'vitest'
import type { StructureLayer, StructureNode, StructureTree } from '@/api/structure'
import { buildMemberRow, buildNodeRows } from '@/lib/structure-table-rows'
import { filterTreeToSubtree } from '@/lib/structure-tree'

function layer(id: string, sortOrder: number, displayName: string, standardType: string): StructureLayer {
  return { id, sortOrder, displayName, standardType: standardType as StructureLayer['standardType'] }
}

function node(id: string, layerId: string, parentNodeId: string | null, name: string): StructureNode {
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

describe('buildNodeRows parent labels', () => {
  it('resolves the parent name after the tree is scoped to a deepest-layer unit', () => {
    const tree: StructureTree = {
      churchId: 'church-1',
      churchName: 'Hilltop',
      template: {
        id: 'tpl-1',
        name: 'Test',
        layers: [layer('fel', 0, 'Fellowship', 'Fellowship'), layer('cell', 1, 'Cell', 'Cell')],
      },
      nodes: [
        node('f1', 'fel', null, 'Titans Fellowship'),
        node('c1', 'cell', 'f1', 'Smoke Cell Alpha'),
      ],
      members: [],
    }

    const rows = buildNodeRows(filterTreeToSubtree(tree, 'c1'), 'cell')

    expect(rows).toEqual([
      expect.objectContaining({
        id: 'c1',
        parent: 'Titans Fellowship',
      }),
    ])
  })
})

describe('buildMemberRow ancestor labels', () => {
  it('fills the fellowship segment when the scoped tree still has the ancestor node', () => {
    const tree: StructureTree = {
      churchId: 'church-1',
      churchName: 'Hilltop',
      template: {
        id: 'tpl-1',
        name: 'Test',
        layers: [layer('fel', 0, 'Fellowship', 'Fellowship'), layer('cell', 1, 'Cell', 'Cell')],
      },
      nodes: [
        node('f1', 'fel', null, 'Titans'),
        node('c1', 'cell', 'f1', 'Titans Cell'),
      ],
      members: [
        {
          id: 'm1',
          parentNodeId: 'c1',
          name: 'Ada',
          email: null,
          phone: null,
          age: null,
          dateOfBirth: null,
          residence: null,
          state: null,
          occupationStatus: null,
          schoolOrWorkplace: null,
          workplace: null,
          position: 'Member',
          responsiveness: 3,
          rosterStatus: 'Pending',
        },
      ],
    }

    const row = buildMemberRow(filterTreeToSubtree(tree, 'c1'), tree.members[0])
    expect(row.structure.find((s) => s.standardType === 'Fellowship')?.nodeName).toBe('Titans')
  })
})
