import { describe, expect, it } from 'vitest'
import type { StructureTree } from '@/api/structure'
import {
  churchHasLayerType,
  memberStructureUnitLabel,
  structureScopeColumnLabel,
} from '@/features/giving/lib/contribution-structure'

function treeWithoutPfcc(): StructureTree {
  return {
    churchId: 'church-ca',
    churchName: 'Canada Church',
    template: {
      id: 'template-1',
      name: 'Canada',
      layers: [
        { id: 'fellowship', sortOrder: 0, standardType: 'Fellowship', displayName: 'Fellowship' },
        { id: 'cell', sortOrder: 1, standardType: 'Cell', displayName: 'Cell' },
      ],
    },
    nodes: [
      {
        id: 'f1',
        layerId: 'fellowship',
        parentNodeId: null,
        name: 'Titans',
        unitNumber: '1',
        leaderMemberId: null,
        leaderName: null,
      },
      {
        id: 'c1',
        layerId: 'cell',
        parentNodeId: 'f1',
        name: 'Cell A',
        unitNumber: '1',
        leaderMemberId: null,
        leaderName: null,
      },
    ],
    members: [],
  }
}

function treeWithPfcc(): StructureTree {
  return {
    churchId: 'church-gh',
    churchName: 'Ghana Church',
    template: {
      id: 'template-2',
      name: 'Standard',
      layers: [
        { id: 'pfcc', sortOrder: 0, standardType: 'PFCC', displayName: 'PFCC' },
        { id: 'fellowship', sortOrder: 1, standardType: 'Fellowship', displayName: 'Fellowship' },
        { id: 'cell', sortOrder: 2, standardType: 'Cell', displayName: 'Cell' },
      ],
    },
    nodes: [
      {
        id: 'p1',
        layerId: 'pfcc',
        parentNodeId: null,
        name: 'PFCC North',
        unitNumber: '1',
        leaderMemberId: null,
        leaderName: null,
      },
      {
        id: 'f1',
        layerId: 'fellowship',
        parentNodeId: 'p1',
        name: 'Titans',
        unitNumber: '1',
        leaderMemberId: null,
        leaderName: null,
      },
      {
        id: 'c1',
        layerId: 'cell',
        parentNodeId: 'f1',
        name: 'Cell A',
        unitNumber: '1',
        leaderMemberId: null,
        leaderName: null,
      },
    ],
    members: [],
  }
}

describe('structure-aware contribution labels', () => {
  it('does not claim PFCC when the template has none', () => {
    const tree = treeWithoutPfcc()
    expect(churchHasLayerType(tree, 'PFCC')).toBe(false)
    expect(structureScopeColumnLabel(tree)).toBe('Fellowship')
    expect(memberStructureUnitLabel(tree, 'c1')).toBe('Titans')
  })

  it('uses PFCC when the template includes it', () => {
    const tree = treeWithPfcc()
    expect(churchHasLayerType(tree, 'PFCC')).toBe(true)
    expect(structureScopeColumnLabel(tree)).toBe('PFCC')
    expect(memberStructureUnitLabel(tree, 'c1')).toBe('PFCC North')
  })
})
