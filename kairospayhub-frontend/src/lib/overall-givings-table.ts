import type { MemberGivingCampaign, MemberGivingTotal } from '@/api/giving'
import type { StructureLayer, StructureTree } from '@/api/structure'
import type { StructureMemberRow, StructureSegment } from '@/lib/structure-table-rows'
import { getLayers, memberStructureSegments } from '@/lib/structure-tree'

export const OVERALL_GIVINGS_COLUMNS_STORAGE_KEY = 'overall-givings-columns-v1'
export const OVERALL_GIVINGS_CHIP_LIMIT = 3
export const OVERALL_GIVINGS_FILTER_FETCH_CAP = 500

export type OverallGivingsStructureColumn = {
  id: string
  layerId: string
  label: string
  standardType: string
}

export function truncateCampaignChips(
  campaigns: MemberGivingCampaign[],
  limit = OVERALL_GIVINGS_CHIP_LIMIT,
): { visible: MemberGivingCampaign[]; overflow: number } {
  if (campaigns.length <= limit) {
    return { visible: campaigns, overflow: 0 }
  }
  return {
    visible: campaigns.slice(0, limit),
    overflow: campaigns.length - limit,
  }
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
): Record<string, boolean> {
  const visibility: Record<string, boolean> = {
    expand: true,
    rank: true,
    memberName: true,
    approvedTotal: true,
    approvedCount: true,
    campaigns: true,
    lastDateSent: true,
    pendingCount: false,
    pendingTotal: false,
    actions: true,
  }
  for (const column of structureColumns) {
    visibility[column.id] = true
  }
  return visibility
}

export function loadOverallGivingsColumnVisibility(
  structureColumns: OverallGivingsStructureColumn[],
  storage: Pick<Storage, 'getItem'> | null = typeof localStorage !== 'undefined' ? localStorage : null,
): Record<string, boolean> {
  const defaults = defaultOverallGivingsColumnVisibility(structureColumns)
  if (!storage) return defaults
  try {
    const raw = storage.getItem(OVERALL_GIVINGS_COLUMNS_STORAGE_KEY)
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
) {
  if (!storage) return
  try {
    storage.setItem(OVERALL_GIVINGS_COLUMNS_STORAGE_KEY, JSON.stringify(visibility))
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
  if (visible.has('campaigns')) {
    for (const campaign of row.campaigns) {
      parts.push(campaign.title)
      parts.push(String(campaign.approvedAmount))
    }
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
): boolean {
  const trimmed = query.trim().toLowerCase()
  if (!trimmed) return true
  return memberGivingVisibleSearchText(row, tree, visibleColumnIds, structureColumns).includes(
    trimmed,
  )
}
