import { describe, expect, it } from 'vitest'
import type { MemberGivingCampaign, MemberGivingTotal } from '@/api/giving'
import type { StructureTree } from '@/api/structure'
import { applyMemberFilterRules, createMemberFilterRule } from '@/lib/member-filters'
import {
  buildOverallGivingsStructureColumns,
  memberGivingMatchesVisibleSearch,
  memberGivingToFilterRow,
  truncateCampaignChips,
} from '@/lib/overall-givings-table'

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
      {
        id: 'f2',
        layerId: 'fellowship',
        parentNodeId: null,
        name: 'Harvest',
        unitNumber: '2',
        leaderMemberId: null,
        leaderName: null,
      },
      {
        id: 'c2',
        layerId: 'cell',
        parentNodeId: 'f2',
        name: 'Cell B',
        unitNumber: '2',
        leaderMemberId: null,
        leaderName: null,
      },
    ],
    members: [],
  }
}

const campaigns: MemberGivingCampaign[] = [
  { programId: '1', title: 'Rhapsody 2026', parentProgramId: null, approvedAmount: 50, approvedCount: 1 },
  {
    programId: '2',
    title: 'January Rhapsody',
    parentProgramId: '1',
    approvedAmount: 75,
    approvedCount: 1,
  },
  { programId: '3', title: 'Sunday', parentProgramId: null, approvedAmount: 20, approvedCount: 1 },
  { programId: '4', title: 'Special', parentProgramId: null, approvedAmount: 10, approvedCount: 1 },
]

describe('truncateCampaignChips', () => {
  it('returns all campaigns when under the limit', () => {
    const result = truncateCampaignChips(campaigns.slice(0, 2), 3)
    expect(result.visible).toHaveLength(2)
    expect(result.overflow).toBe(0)
  })

  it('truncates with overflow count', () => {
    const result = truncateCampaignChips(campaigns, 3)
    expect(result.visible).toHaveLength(3)
    expect(result.overflow).toBe(1)
  })
})

describe('buildOverallGivingsStructureColumns', () => {
  it('builds one column per template layer and omits PFCC when absent', () => {
    const columns = buildOverallGivingsStructureColumns(treeWithoutPfcc())
    expect(columns.map((c) => c.label)).toEqual(['Fellowship', 'Cell'])
    expect(columns.some((c) => c.standardType === 'PFCC')).toBe(false)
  })
})

describe('memberGivingToFilterRow + filters', () => {
  const tree = treeWithoutPfcc()
  const rows: MemberGivingTotal[] = [
    {
      rank: 1,
      memberId: 'm1',
      memberName: 'Kojo Mensah',
      memberParentNodeId: 'c1',
      approvedTotal: 100,
      approvedCount: 2,
      pendingCount: 0,
      pendingTotal: 0,
      lastDateSent: '2026-08-10T00:00:00Z',
      campaigns: [],
    },
    {
      rank: 2,
      memberId: 'm2',
      memberName: 'Ama Boateng',
      memberParentNodeId: 'c2',
      approvedTotal: 80,
      approvedCount: 1,
      pendingCount: 0,
      pendingTotal: 0,
      lastDateSent: '2026-08-01T00:00:00Z',
      campaigns: [],
    },
  ]

  it('filters by member name contains', () => {
    const filterRows = rows.map((row) => memberGivingToFilterRow(row, tree))
    const rule = { ...createMemberFilterRule('name'), operator: 'contains' as const, value: 'Kojo' }
    const matched = applyMemberFilterRules(filterRows, [rule])
    expect(matched.map((r) => r.id)).toEqual(['m1'])
  })

  it('filters by fellowship unit', () => {
    const filterRows = rows.map((row) => memberGivingToFilterRow(row, tree))
    const rule = {
      ...createMemberFilterRule('layer:fellowship'),
      operator: 'is' as const,
      value: 'Titans',
    }
    const matched = applyMemberFilterRules(filterRows, [rule])
    expect(matched.map((r) => r.id)).toEqual(['m1'])
  })
})

describe('memberGivingMatchesVisibleSearch', () => {
  const tree = treeWithoutPfcc()
  const structureColumns = buildOverallGivingsStructureColumns(tree)
  const row: MemberGivingTotal = {
    rank: 1,
    memberId: 'm1',
    memberName: 'Kojo Mensah',
    memberParentNodeId: 'c1',
    approvedTotal: 100,
    approvedCount: 2,
    pendingCount: 0,
    pendingTotal: 0,
    lastDateSent: '2026-08-10T00:00:00Z',
    campaigns: [
      {
        programId: '1',
        title: 'January Rhapsody',
        parentProgramId: 'root',
        approvedAmount: 75,
        approvedCount: 1,
      },
    ],
  }

  it('matches campaign titles when campaigns column is visible', () => {
    expect(
      memberGivingMatchesVisibleSearch(
        row,
        'january',
        tree,
        ['memberName', 'campaigns'],
        structureColumns,
      ),
    ).toBe(true)
  })

  it('ignores hidden campaign column when searching', () => {
    expect(
      memberGivingMatchesVisibleSearch(row, 'january', tree, ['memberName'], structureColumns),
    ).toBe(false)
  })

  it('matches structure unit when that layer column is visible', () => {
    expect(
      memberGivingMatchesVisibleSearch(
        row,
        'titans',
        tree,
        ['structure:fellowship'],
        structureColumns,
      ),
    ).toBe(true)
  })
})
