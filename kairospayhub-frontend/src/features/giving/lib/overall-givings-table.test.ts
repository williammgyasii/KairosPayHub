import { describe, expect, it } from 'vitest'
import type { MemberGivingTotal } from '@/features/giving/api'
import type { StructureTree } from '@/api/structure'
import { applyMemberFilterRules, createMemberFilterRule } from '@/lib/member-filters'
import {
  amountForCampaign,
  applyOverallAmountFilters,
  buildOverallGivingsStructureColumns,
  campaignColumnId,
  CAMPAIGN_GIVINGS_COLUMNS_STORAGE_KEY,
  collectCampaignColumns,
  createOverallAmountFilterRule,
  defaultOverallGivingsColumnVisibility,
  memberGivingMatchesVisibleSearch,
  memberGivingToFilterRow,
  OVERALL_GIVINGS_COLUMNS_STORAGE_KEY,
  overallGivingsColumnsStorageKey,
  rowMatchesOverallAmountFilter,
  stickyColumnIdsForTier,
  stickyColumnLeft,
  stickyColumnWidth,
  stickyTierForWidth,
} from '@/features/giving/lib/overall-givings-table'

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

describe('collectCampaignColumns', () => {
  it('unions campaigns with mains before subs', () => {
    const rows: MemberGivingTotal[] = [
      {
        rank: 1,
        memberId: 'm1',
        memberName: 'Kojo',
        memberParentNodeId: 'c1',
        approvedTotal: 125,
        approvedCount: 2,
        pendingCount: 0,
        pendingTotal: 0,
        lastDateSent: null,
        campaigns: [
          {
            programId: 'sub',
            title: 'January Rhapsody',
            parentProgramId: 'root',
            approvedAmount: 75,
            approvedCount: 1,
          },
          {
            programId: 'root',
            title: 'Rhapsody 2026',
            parentProgramId: null,
            approvedAmount: 50,
            approvedCount: 1,
          },
        ],
      },
      {
        rank: 2,
        memberId: 'm2',
        memberName: 'Ama',
        memberParentNodeId: 'c2',
        approvedTotal: 20,
        approvedCount: 1,
        pendingCount: 0,
        pendingTotal: 0,
        lastDateSent: null,
        campaigns: [
          {
            programId: 'sunday',
            title: 'Sunday Service',
            parentProgramId: null,
            approvedAmount: 20,
            approvedCount: 1,
          },
        ],
      },
    ]

    const columns = collectCampaignColumns(rows)
    expect(columns.map((c) => c.programId)).toEqual(['root', 'sunday', 'sub'])
    expect(columns[0]?.isSubCampaign).toBe(false)
    expect(columns[2]?.isSubCampaign).toBe(true)
    expect(amountForCampaign(rows[0]!, 'sub')).toBe(75)
    expect(amountForCampaign(rows[0]!, 'sunday')).toBeNull()
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
  const campaignColumns = collectCampaignColumns([row])

  it('matches campaign amount columns when visible', () => {
    expect(
      memberGivingMatchesVisibleSearch(
        row,
        'january',
        tree,
        [campaignColumnId('1')],
        structureColumns,
        campaignColumns,
      ),
    ).toBe(true)
  })

  it('ignores hidden campaign columns when searching', () => {
    expect(
      memberGivingMatchesVisibleSearch(
        row,
        'january',
        tree,
        ['memberName'],
        structureColumns,
        campaignColumns,
      ),
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
        campaignColumns,
      ),
    ).toBe(true)
  })
})

describe('overall amount filters', () => {
  const rows: MemberGivingTotal[] = [
    {
      rank: 1,
      memberId: 'm1',
      memberName: 'Kojo',
      memberParentNodeId: 'c1',
      approvedTotal: 125,
      approvedCount: 2,
      pendingCount: 0,
      pendingTotal: 0,
      lastDateSent: null,
      campaigns: [
        {
          programId: 'root',
          title: 'Rhapsody',
          parentProgramId: null,
          approvedAmount: 50,
          approvedCount: 1,
        },
        {
          programId: 'sub',
          title: 'January',
          parentProgramId: 'root',
          approvedAmount: 75,
          approvedCount: 1,
        },
      ],
    },
    {
      rank: 2,
      memberId: 'm2',
      memberName: 'Ama',
      memberParentNodeId: 'c2',
      approvedTotal: 20,
      approvedCount: 1,
      pendingCount: 0,
      pendingTotal: 0,
      lastDateSent: null,
      campaigns: [
        {
          programId: 'root',
          title: 'Rhapsody',
          parentProgramId: null,
          approvedAmount: 20,
          approvedCount: 1,
        },
      ],
    },
  ]

  it('filters approved total greater than', () => {
    const rule = { ...createOverallAmountFilterRule('approvedTotal'), operator: 'gt' as const, value: '100' }
    expect(applyOverallAmountFilters(rows, [rule]).map((r) => r.memberId)).toEqual(['m1'])
  })

  it('filters a campaign amount less than', () => {
    const rule = {
      ...createOverallAmountFilterRule('campaign:root'),
      operator: 'lt' as const,
      value: '40',
    }
    expect(rowMatchesOverallAmountFilter(rows[1]!, rule)).toBe(true)
    expect(applyOverallAmountFilters(rows, [rule]).map((r) => r.memberId)).toEqual(['m2'])
  })

  it('treats missing campaign amount as zero', () => {
    const rule = {
      ...createOverallAmountFilterRule('campaign:sub'),
      operator: 'lt' as const,
      value: '10',
    }
    expect(applyOverallAmountFilters(rows, [rule]).map((r) => r.memberId)).toEqual(['m2'])
  })
})

describe('overallGivingsColumnsStorageKey', () => {
  it('uses separate keys for church vs campaign scope', () => {
    expect(overallGivingsColumnsStorageKey('church')).toBe(OVERALL_GIVINGS_COLUMNS_STORAGE_KEY)
    expect(overallGivingsColumnsStorageKey('campaign')).toBe(CAMPAIGN_GIVINGS_COLUMNS_STORAGE_KEY)
    expect(OVERALL_GIVINGS_COLUMNS_STORAGE_KEY).not.toBe(CAMPAIGN_GIVINGS_COLUMNS_STORAGE_KEY)
  })

  it('uses v3 storage keys for denser defaults migration', () => {
    expect(OVERALL_GIVINGS_COLUMNS_STORAGE_KEY).toContain('v3')
    expect(CAMPAIGN_GIVINGS_COLUMNS_STORAGE_KEY).toContain('v3')
  })
})

describe('sticky tiers', () => {
  it('uses member-only sticky below md', () => {
    expect(stickyTierForWidth(400)).toBe('member')
    expect(stickyColumnIdsForTier('member')).toEqual(['memberName'])
    expect(stickyColumnLeft('memberName', 'member')).toBe(0)
    expect(stickyColumnLeft('rank', 'member')).toBeNull()
    expect(stickyColumnLeft('approvedTotal', 'member')).toBeNull()
  })

  it('sticks rank + member on md', () => {
    expect(stickyTierForWidth(800)).toBe('rank-member')
    expect(stickyColumnLeft('rank', 'rank-member')).toBe(0)
    expect(stickyColumnLeft('memberName', 'rank-member')).toBe(stickyColumnWidth('rank', 'rank-member'))
    expect(stickyColumnLeft('approvedTotal', 'rank-member')).toBeNull()
  })

  it('sticks rank + member + total on lg', () => {
    expect(stickyTierForWidth(1280)).toBe('full')
    expect(stickyColumnLeft('approvedTotal', 'full')).toBe(
      (stickyColumnWidth('rank', 'full') ?? 0) + (stickyColumnWidth('memberName', 'full') ?? 0),
    )
  })
})

describe('defaultOverallGivingsColumnVisibility', () => {
  it('hides campaign amount columns by default', () => {
    const structure = buildOverallGivingsStructureColumns(treeWithoutPfcc())
    const campaigns = [
      {
        id: campaignColumnId('root'),
        programId: 'root',
        title: 'Rhapsody',
        parentProgramId: null,
        isSubCampaign: false,
      },
      {
        id: campaignColumnId('sub'),
        programId: 'sub',
        title: 'January',
        parentProgramId: 'root',
        isSubCampaign: true,
      },
    ]
    const visibility = defaultOverallGivingsColumnVisibility(structure, campaigns)
    expect(visibility.rank).toBe(true)
    expect(visibility.memberName).toBe(true)
    expect(visibility.approvedTotal).toBe(true)
    expect(visibility.lastDateSent).toBe(true)
    expect(visibility[campaignColumnId('root')]).toBe(false)
    expect(visibility[campaignColumnId('sub')]).toBe(false)
    expect(visibility['structure:fellowship']).toBe(true)
    expect(visibility['structure:cell']).toBe(true)
  })
})
