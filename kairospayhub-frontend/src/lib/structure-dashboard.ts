import type { StructureTree } from '@/api/structure'
import { getLayers, nodesAtLayer } from '@/lib/structure-tree'
import { fellowshipBreakdownRows } from '@/lib/structure-table-rows'

export const CHART_COLORS = [
  '#6366f1',
  '#8b5cf6',
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#94a3b8',
] as const

export function hasTemplate(tree: StructureTree | null) {
  return (tree?.template?.layers.length ?? 0) > 0
}

export function isStructureEmpty(tree: StructureTree | null) {
  if (!tree) return true
  return !hasTemplate(tree) && tree.nodes.length === 0 && tree.members.length === 0
}

export function isStructureSetupComplete(tree: StructureTree | null) {
  if (!tree) return false
  return hasTemplate(tree) && tree.members.length > 0
}

export function structureProgress(tree: StructureTree | null) {
  if (!tree) return 0
  if (!hasTemplate(tree)) return 1
  let done = 2
  if (tree.nodes.length > 0) done += 1
  if (tree.members.length > 0) done += 1
  return done
}

export function fellowshipBreakdown(tree: StructureTree) {
  return fellowshipBreakdownRows(tree)
}

export function structureLayerChartData(tree: StructureTree) {
  const layers = getLayers(tree)
  return [
    ...layers.map((layer, i) => ({
      layer: layer.displayName,
      count: nodesAtLayer(tree, layer.id).length,
      fill: CHART_COLORS[i % CHART_COLORS.length],
    })),
    {
      layer: 'Members',
      count: tree.members.length,
      fill: CHART_COLORS[4],
    },
  ]
}

export function membersByFellowshipChart(tree: StructureTree) {
  return fellowshipBreakdown(tree)
    .filter((f) => f.members > 0)
    .map((f, i) => ({
      name: f.name.length > 14 ? `${f.name.slice(0, 14)}…` : f.name,
      fullName: f.name,
      members: f.members,
      fill: CHART_COLORS[i % CHART_COLORS.length],
    }))
}

export function dashboardQuickStats(tree: StructureTree) {
  const cellLayer = getLayers(tree).find((l) => l.standardType === 'Cell')
  const cellNodes = cellLayer ? nodesAtLayer(tree, cellLayer.id) : []
  const avgMembersPerCell =
    cellNodes.length > 0 ? (tree.members.length / cellNodes.length).toFixed(1) : '—'
  const emptyCells = cellNodes.filter(
    (c) => !tree.members.some((m) => m.parentNodeId === c.id),
  ).length

  return [
    { label: 'Avg members / cell', value: avgMembersPerCell },
    { label: 'Empty cells', value: String(emptyCells) },
    { label: 'Org nodes', value: String(tree.nodes.length) },
    { label: 'Total roster', value: String(tree.members.length) },
  ]
}

export function dashboardRecommendations(tree: StructureTree | null): string[] {
  if (!tree) return ['Loading your church data…']
  const tips: string[] = []

  if (!hasTemplate(tree)) {
    tips.push('Define your church layer chain first — then add groups, PFCCs, fellowships, and cells.')
    return tips
  }

  if (tree.nodes.length === 0) {
    tips.push('Add nodes at each layer under Roster.')
    return tips
  }

  if (tree.members.length === 0) {
    tips.push('Add members under Membership once roster units exist.')
  }

  const cellLayer = getLayers(tree).find((l) => l.standardType === 'Cell')
  if (cellLayer) {
    const cells = nodesAtLayer(tree, cellLayer.id)
    const empty = cells.filter((c) => !tree.members.some((m) => m.parentNodeId === c.id)).length
    if (empty > 0) {
      tips.push(`${empty} cell(s) have no members yet — balance your roster.`)
    }
  }

  if (tips.length === 0) {
    tips.push('Structure looks good. Giving programs are coming in the next phase.')
    tips.push('Upload your church logo in Settings for a branded sidebar.')
  }

  return tips
}

export function dashboardMetrics(tree: StructureTree) {
  const layers = getLayers(tree)
  return [
    ...layers.map((layer) => ({
      key: layer.id,
      label: layer.displayName,
      value: nodesAtLayer(tree, layer.id).length,
    })),
    { key: 'members', label: 'Members', value: tree.members.length },
  ]
}
