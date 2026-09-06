import type { MemberGivingCampaign, MemberGivingTotal } from '@/api/giving'
import type { StructureLayer, StructureTree } from '@/api/structure'
import type { StructureMemberRow, StructureSegment } from '@/lib/structure-table-rows'
import { getLayers, memberStructureSegments } from '@/lib/structure-tree'

export const OVERALL_GIVINGS_COLUMNS_STORAGE_KEY = 'overall-givings-columns-v2'
export const CAMPAIGN_GIVINGS_COLUMNS_STORAGE_KEY = 'campaign-givings-columns-v2'
export const OVERALL_GIVINGS_FILTER_FETCH_CAP = 500

export type MemberGivingsScopeMode = 'church' | 'campaign'

export function overallGivingsColumnsStorageKey(scopeMode: MemberGivingsScopeMode) {
  return scopeMode === 'campaign'
    ? CAMPAIGN_GIVINGS_COLUMNS_STORAGE_KEY
    : OVERALL_GIVINGS_COLUMNS_STORAGE_KEY
}
export const OVERALL_GIVINGS_STICKY_RANK_WIDTH = 56
export const OVERALL_GIVINGS_STICKY_MEMBER_WIDTH = 180
export const OVERALL_GIVINGS_STICKY_TOTAL_WIDTH = 132

export const OVERALL_GIVINGS_STICKY_COLUMN_IDS = [
  'rank',
  'memberName',
  'approvedTotal',
] as const

export function stickyColumnLeft(columnId: string): number | null {
  if (columnId === 'rank') return 0
  if (columnId === 'memberName') return OVERALL_GIVINGS_STICKY_RANK_WIDTH
  if (columnId === 'approvedTotal') {
    return OVERALL_GIVINGS_STICKY_RANK_WIDTH + OVERALL_GIVINGS_STICKY_MEMBER_WIDTH
  }
  return null
}

export function stickyColumnWidth(columnId: string): number | null {
  if (columnId === 'rank') return OVERALL_GIVINGS_STICKY_RANK_WIDTH
  if (columnId === 'memberName') return OVERALL_GIVINGS_STICKY_MEMBER_WIDTH
  if (columnId === 'approvedTotal') return OVERALL_GIVINGS_STICKY_TOTAL_WIDTH
  return null
}

export type OverallGivingsStructureColumn = {
  id: string
  layerId: string
  label: string
  standardType: string
}

export type OverallGivingsCampaignColumn = {
  id: string
  programId: string
  title: string
  parentProgramId: string | null
  isSubCampaign: boolean
}

export function campaignColumnId(programId: string) {
  return `campaign:${programId}`
}

/** Unique campaigns across member rows, mains first then subs, title-sorted within group. */
export function collectCampaignColumns(
  rows: MemberGivingTotal[],
): OverallGivingsCampaignColumn[] {
  const byId = new Map<string, MemberGivingCampaign>()
  for (const row of rows) {
    for (const campaign of row.campaigns) {
      if (!byId.has(campaign.programId)) byId.set(campaign.programId, campaign)
    }
  }

  return [...byId.values()]
    .sort((a, b) => {
      const aSub = a.parentProgramId ? 1 : 0
      const bSub = b.parentProgramId ? 1 : 0
      if (aSub !== bSub) return aSub - bSub
      return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })
    })
    .map((campaign) => ({
      id: campaignColumnId(campaign.programId),
      programId: campaign.programId,
      title: campaign.title,
      parentProgramId: campaign.parentProgramId,
      isSubCampaign: Boolean(campaign.parentProgramId),
    }))
}

export function amountForCampaign(
  row: MemberGivingTotal,
  programId: string,
): number | null {
  const match = row.campaigns.find((campaign) => campaign.programId === programId)
  return match ? match.approvedAmount : null
}

export function buildOverallGivingsStructureColumns(
  tree: StructureTree | null,
): OverallGivingsStructureColumn[] {
  if (!tree) return []
  return getLayers(tree).map((layer) => ({
    id: `structure:${layer.id}`,
    layerId: layer.id,
    label: layer.displayName,
    standardType: layer.standardType,
  }))
}

export function structureUnitForLayer(
  tree: StructureTree | null,
  memberParentNodeId: string,
  layerId: string,
): string {
  if (!tree || !memberParentNodeId) return '—'
  const segment = memberStructureSegments(tree, memberParentNodeId).find(
    (item) => item.layerId === layerId,
  )
  return segment?.nodeName ?? '—'
}

export function defaultOverallGivingsColumnVisibility(
  structureColumns: OverallGivingsStructureColumn[],
  campaignColumns: OverallGivingsCampaignColumn[] = [],
): Record<string, boolean> {
  const visibility: Record<string, boolean> = {
    rank: true,
    memberName: true,
    approvedTotal: true,
    approvedCount: true,
    lastDateSent: true,
    pendingCount: false,
    pendingTotal: false,
    actions: true,
  }
  for (const column of structureColumns) {
    visibility[column.id] = true
  }
  for (const column of campaignColumns) {
    visibility[column.id] = true
  }
  return visibility
}

export function loadOverallGivingsColumnVisibility(
  structureColumns: OverallGivingsStructureColumn[],
  campaignColumns: OverallGivingsCampaignColumn[] = [],
  storage: Pick<Storage, 'getItem'> | null = typeof localStorage !== 'undefined' ? localStorage : null,
  scopeMode: MemberGivingsScopeMode = 'church',
): Record<string, boolean> {
  const defaults = defaultOverallGivingsColumnVisibility(structureColumns, campaignColumns)
  if (!storage) return defaults
  try {
    const raw = storage.getItem(overallGivingsColumnsStorageKey(scopeMode))
    if (!raw) return defaults
    const parsed = JSON.parse(raw) as Record<string, boolean>
    return { ...defaults, ...parsed }
  } catch {
    return defaults
  }
}

export function persistOverallGivingsColumnVisibility(
  visibility: Record<string, boolean>,
  storage: Pick<Storage, 'setItem'> | null = typeof localStorage !== 'undefined' ? localStorage : null,
  scopeMode: MemberGivingsScopeMode = 'church',
) {
  if (!storage) return
  try {
    storage.setItem(overallGivingsColumnsStorageKey(scopeMode), JSON.stringify(visibility))
  } catch {
    // ignore quota / private mode
  }
}

export function memberGivingToFilterRow(
  row: MemberGivingTotal,
  tree: StructureTree | null,
): StructureMemberRow {
  const structure: StructureSegment[] =
    tree && row.memberParentNodeId
      ? memberStructureSegments(tree, row.memberParentNodeId)
      : []

  return {
    id: row.memberId,
    member: row.memberName,
    email: '',
    phone: '',
    dateOfBirth: '',
    residence: '',
    occupationStatus: '',
    schoolOrWorkplace: '',
    age: '',
    role: '',
    path: structure.map((segment) => segment.nodeName).join(' · '),
    parentNodeId: row.memberParentNodeId,
    position: 'Member',
    responsiveness: 0,
    structure,
  }
}

export function structureLayersForFilters(
  tree: StructureTree | null,
): Pick<StructureLayer, 'id' | 'displayName' | 'standardType'>[] {
  if (!tree) return []
  return getLayers(tree).map((layer) => ({
    id: layer.id,
    displayName: layer.displayName,
    standardType: layer.standardType,
  }))
}

/** Build a searchable string from only currently visible overall-givings columns. */
export function memberGivingVisibleSearchText(
  row: MemberGivingTotal,
  tree: StructureTree | null,
  visibleColumnIds: string[],
  structureColumns: OverallGivingsStructureColumn[],
  campaignColumns: OverallGivingsCampaignColumn[] = [],
): string {
  const parts: string[] = []
  const visible = new Set(visibleColumnIds)

  if (visible.has('rank') && row.rank > 0) parts.push(String(row.rank))
  if (visible.has('memberName')) parts.push(row.memberName)
  if (visible.has('approvedTotal')) parts.push(String(row.approvedTotal))
  if (visible.has('approvedCount')) parts.push(String(row.approvedCount))
  if (visible.has('lastDateSent') && row.lastDateSent) parts.push(row.lastDateSent)
  if (visible.has('pendingCount')) parts.push(String(row.pendingCount))
  if (visible.has('pendingTotal')) parts.push(String(row.pendingTotal))

  for (const column of campaignColumns) {
    if (!visible.has(column.id)) continue
    const amount = amountForCampaign(row, column.programId)
    if (amount == null) continue
    parts.push(column.title)
    parts.push(String(amount))
  }

  for (const column of structureColumns) {
    if (!visible.has(column.id)) continue
    parts.push(structureUnitForLayer(tree, row.memberParentNodeId, column.layerId))
  }

  return parts.join(' ').toLowerCase()
}

export function memberGivingMatchesVisibleSearch(
  row: MemberGivingTotal,
  query: string,
  tree: StructureTree | null,
  visibleColumnIds: string[],
  structureColumns: OverallGivingsStructureColumn[],
  campaignColumns: OverallGivingsCampaignColumn[] = [],
): boolean {
  const trimmed = query.trim().toLowerCase()
  if (!trimmed) return true
  return memberGivingVisibleSearchText(
    row,
    tree,
    visibleColumnIds,
    structureColumns,
    campaignColumns,
  ).includes(trimmed)
}

export type OverallAmountFilterOperator = 'lt' | 'lte' | 'eq' | 'gte' | 'gt'

export type OverallAmountFilterRule = {
  id: string
  /** `approvedTotal` or `campaign:{programId}` */
  scope: 'approvedTotal' | `campaign:${string}`
  operator: OverallAmountFilterOperator
  value: string
}

let amountRuleCounter = 0

export function createOverallAmountFilterRule(
  scope: OverallAmountFilterRule['scope'] = 'approvedTotal',
): OverallAmountFilterRule {
  amountRuleCounter += 1
  return {
    id: `amount-filter-${amountRuleCounter}`,
    scope,
    operator: 'gte',
    value: '',
  }
}

export function amountFilterOperatorLabel(operator: OverallAmountFilterOperator) {
  switch (operator) {
    case 'lt':
      return 'less than'
    case 'lte':
      return 'at most'
    case 'eq':
      return 'equals'
    case 'gte':
      return 'at least'
    case 'gt':
      return 'greater than'
  }
}

export function getActiveOverallAmountFilters(rules: OverallAmountFilterRule[]) {
  return rules.filter((rule) => {
    if (!rule.scope) return false
    const amount = Number(rule.value)
    return rule.value.trim().length > 0 && Number.isFinite(amount)
  })
}

function amountForFilterScope(row: MemberGivingTotal, scope: OverallAmountFilterRule['scope']) {
  if (scope === 'approvedTotal') return row.approvedTotal
  const programId = scope.slice('campaign:'.length)
  return amountForCampaign(row, programId) ?? 0
}

export function rowMatchesOverallAmountFilter(
  row: MemberGivingTotal,
  rule: OverallAmountFilterRule,
): boolean {
  const compare = Number(rule.value)
  if (!Number.isFinite(compare)) return true
  const amount = amountForFilterScope(row, rule.scope)
  switch (rule.operator) {
    case 'lt':
      return amount < compare
    case 'lte':
      return amount <= compare
    case 'eq':
      return amount === compare
    case 'gte':
      return amount >= compare
    case 'gt':
      return amount > compare
  }
}

export function applyOverallAmountFilters(
  rows: MemberGivingTotal[],
  rules: OverallAmountFilterRule[],
): MemberGivingTotal[] {
  const active = getActiveOverallAmountFilters(rules)
  if (active.length === 0) return rows
  return rows.filter((row) => active.every((rule) => rowMatchesOverallAmountFilter(row, rule)))
}
