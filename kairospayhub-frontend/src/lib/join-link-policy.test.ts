import { describe, expect, it } from 'vitest'
import type { StructureLayer, StructureLayerType, StructureNode, StructureTree } from '@/api/structure'
import {
  canShowPendingMembersTab,
  canSubmitJoinVitals,
  membershipPrimaryAction,
} from '@/lib/join-link-policy'

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

const fellowship = layer('fel', 0, 'Fellowship', 'Fellowship')
const cell = layer('cell', 1, 'Home group', 'Cell')
const titans = node('titans', 'fel', null, 'Titans')
const cellA = node('cell-a', 'cell', 'titans', 'Cell A')
const twoLayer = tree([fellowship, cell], [titans, cellA])

describe('canSubmitJoinVitals', () => {
  it('requires email and phone before submit', () => {
    const base = {
      name: 'Ada',
      email: 'ada@example.com',
      phoneDialCode: '233',
      phoneLocal: '0241234567',
      dateOfBirth: '1998-06-01',
      state: 'GAR',
      countryCode: 'GH',
    }
    expect(canSubmitJoinVitals(base)).toBe(true)
    expect(canSubmitJoinVitals({ ...base, state: '' })).toBe(false)
    expect(canSubmitJoinVitals({ ...base, email: '' })).toBe(false)
    expect(canSubmitJoinVitals({ ...base, phoneLocal: '' })).toBe(false)
  })
})

describe('membershipPrimaryAction', () => {
  it('shows Generate join link for a deepest-scope leader, not Add member', () => {
    expect(
      membershipPrimaryAction({
        tree: twoLayer,
        canManageRoster: true,
        canManageChurch: false,
        actorScopeNodeId: 'cell-a',
      }),
    ).toBe('generate-join-link')
  })

  it('keeps Add member for a mid-layer leader', () => {
    expect(
      membershipPrimaryAction({
        tree: twoLayer,
        canManageRoster: true,
        canManageChurch: false,
        actorScopeNodeId: 'titans',
      }),
    ).toBe('add-member')
  })

  it('keeps Add member for church-wide actors', () => {
    expect(
      membershipPrimaryAction({
        tree: twoLayer,
        canManageRoster: true,
        canManageChurch: true,
        actorScopeNodeId: null,
      }),
    ).toBe('add-member')
  })
})

describe('canShowPendingMembersTab', () => {
  it('sits next to Generate join link for a deepest-scope leader', () => {
    expect(
      canShowPendingMembersTab({
        tree: twoLayer,
        canManageRoster: true,
        canManageChurch: false,
        actorScopeNodeId: 'cell-a',
      }),
    ).toBe(true)
  })

  it('stays off for mid-layer leaders', () => {
    expect(
      canShowPendingMembersTab({
        tree: twoLayer,
        canManageRoster: true,
        canManageChurch: false,
        actorScopeNodeId: 'titans',
      }),
    ).toBe(false)
  })
})
