import type { MemberPosition, StructureLayer, StructureLayerType, StructureNode, StructureTree } from '@/api/structure'
import { ApiError } from '@/api/core'

export function hasTemplate(tree: StructureTree | null): boolean {
  return (tree?.template?.layers.length ?? 0) > 0
}

export function getLayers(tree: StructureTree): StructureLayer[] {
  return [...(tree.template?.layers ?? [])].sort((a, b) => a.sortOrder - b.sortOrder)
}

export function getDeepestLayer(tree: StructureTree): StructureLayer | undefined {
  const layers = getLayers(tree)
  return layers[layers.length - 1]
}

export function layerById(tree: StructureTree, layerId: string): StructureLayer | undefined {
  return getLayers(tree).find((l) => l.id === layerId)
}

export function nodeById(tree: StructureTree, nodeId: string): StructureNode | undefined {
  return tree.nodes.find((n) => n.id === nodeId)
}

export function nodesAtLayer(tree: StructureTree, layerId: string): StructureNode[] {
  return tree.nodes.filter((n) => n.layerId === layerId)
}

export function parentChain(tree: StructureTree, nodeId: string): StructureNode[] {
  const chain: StructureNode[] = []
  let current = nodeById(tree, nodeId)
  while (current) {
    chain.unshift(current)
    current = current.parentNodeId ? nodeById(tree, current.parentNodeId) : undefined
  }
  return chain
}

export function isDescendantOf(tree: StructureTree, ancestorId: string, nodeId: string): boolean {
  if (ancestorId === nodeId) return true
  let current = nodeById(tree, nodeId)
  while (current?.parentNodeId) {
    if (current.parentNodeId === ancestorId) return true
    current = nodeById(tree, current.parentNodeId)
  }
  return false
}

/** Org layers below a scoped leader's assigned unit (excludes the leader's own layer). */
export function layersBelowScopeRoot(
  tree: StructureTree,
  scopeRootNodeId: string | null | undefined,
): StructureLayer[] {
  const layers = getLayers(tree)
  if (!scopeRootNodeId) return layers

  const scopeNode = nodeById(tree, scopeRootNodeId)
  if (!scopeNode) return layers

  const scopeLayer = layerById(tree, scopeNode.layerId)
  if (!scopeLayer) return layers

  return layers.filter((layer) => layer.sortOrder > scopeLayer.sortOrder)
}

/** Roster Units tabs: layers below scope, or the scope layer when it is the deepest (cell leaders). */
export function rosterLayersForScope(
  tree: StructureTree,
  scopeRootNodeId: string | null | undefined,
): StructureLayer[] {
  if (!scopeRootNodeId) return getLayers(tree)

  const below = layersBelowScopeRoot(tree, scopeRootNodeId)
  if (below.length > 0) return below

  const scopeNode = nodeById(tree, scopeRootNodeId)
  const scopeLayer = scopeNode ? layerById(tree, scopeNode.layerId) : undefined
  return scopeLayer ? [scopeLayer] : getLayers(tree)
}

export function nodesBelowScopeRoot(
  tree: StructureTree,
  nodes: StructureNode[],
  scopeRootNodeId: string | null | undefined,
): StructureNode[] {
  if (!scopeRootNodeId) return nodes

  return nodes.filter(
    (node) => node.id !== scopeRootNodeId && isDescendantOf(tree, scopeRootNodeId, node.id),
  )
}

export function nodePathBelowScopeRoot(
  tree: StructureTree,
  nodeId: string,
  scopeRootNodeId?: string | null,
): string {
  const chain = parentChain(tree, nodeId)
  if (!scopeRootNodeId) return chain.map((node) => node.name).join(' → ')

  const scopeIndex = chain.findIndex((node) => node.id === scopeRootNodeId)
  if (scopeIndex < 0) return chain.map((node) => node.name).join(' → ')

  const below = chain.slice(scopeIndex + 1)
  return below.map((node) => node.name).join(' → ') || nodeById(tree, nodeId)?.name || '—'
}

export function rosterBreadcrumbChain(
  tree: StructureTree,
  unitNodeId: string,
  scopeRootNodeId?: string | null,
): StructureNode[] {
  const ancestors = parentChain(tree, unitNodeId).slice(0, -1)
  if (!scopeRootNodeId) return ancestors

  const scopeIndex = ancestors.findIndex((node) => node.id === scopeRootNodeId)
  if (scopeIndex < 0) return ancestors

  return ancestors.slice(scopeIndex + 1)
}

export function collectSubtreeNodeIds(tree: StructureTree, rootId: string): Set<string> {
  const ids = new Set<string>([rootId])
  let expanded = true
  while (expanded) {
    expanded = false
    for (const node of tree.nodes) {
      if (node.parentNodeId && ids.has(node.parentNodeId) && !ids.has(node.id)) {
        ids.add(node.id)
        expanded = true
      }
    }
  }
  return ids
}

export function filterTreeToSubtree(tree: StructureTree, rootNodeId: string): StructureTree {
  const nodeIds = collectSubtreeNodeIds(tree, rootNodeId)
  return {
    ...tree,
    nodes: tree.nodes.filter((node) => nodeIds.has(node.id)),
    members: tree.members.filter((member) => nodeIds.has(member.parentNodeId)),
  }
}

export function countNodesForLayer(tree: StructureTree, layerId: string): number {
  return nodesAtLayer(tree, layerId).length
}

/** Next sequential unit number among siblings under the same parent at a layer. */
export function nextUnitNumberForParent(
  tree: StructureTree,
  layerId: string,
  parentNodeId: string | null,
): number {
  const siblings = tree.nodes.filter(
    (node) => node.layerId === layerId && node.parentNodeId === parentNodeId,
  )

  let maxNumeric = 0
  for (const node of siblings) {
    const parsed = Number.parseInt(node.unitNumber ?? '', 10)
    if (!Number.isNaN(parsed) && parsed > maxNumeric) maxNumeric = parsed
  }

  return Math.max(maxNumeric, siblings.length) + 1
}

/** Stored unit number, or a stable fallback among siblings under the same parent. */
export function displayUnitNumber(tree: StructureTree, nodeId: string): string {
  const node = nodeById(tree, nodeId)
  if (!node) return ''

  const stored = node.unitNumber?.trim()
  if (stored) return stored

  const siblings = tree.nodes
    .filter((n) => n.layerId === node.layerId && n.parentNodeId === node.parentNodeId)
    .sort((a, b) => {
      const aNum = Number.parseInt(a.unitNumber ?? '', 10)
      const bNum = Number.parseInt(b.unitNumber ?? '', 10)
      if (!Number.isNaN(aNum) && !Number.isNaN(bNum) && aNum !== bNum) return aNum - bNum
      if (!Number.isNaN(aNum)) return -1
      if (!Number.isNaN(bNum)) return 1
      return a.name.localeCompare(b.name) || a.id.localeCompare(b.id)
    })

  const index = siblings.findIndex((sibling) => sibling.id === node.id)
  return index >= 0 ? String(index + 1) : ''
}

export function parentLayerForLayer(
  tree: StructureTree,
  layer: StructureLayer,
): StructureLayer | undefined {
  if (layer.sortOrder <= 0) return undefined
  return getLayers(tree).find((candidate) => candidate.sortOrder === layer.sortOrder - 1)
}

export type StructureParentOption = { id: string; label: string }

export function layerParentOptions(
  tree: StructureTree,
  layer: StructureLayer,
  unitNodeId?: string | null,
): StructureParentOption[] {
  const parentLayer = parentLayerForLayer(tree, layer)
  if (!parentLayer) return []

  const toOptions = (nodes: StructureNode[]) =>
    nodes.map((node) => ({ id: node.id, label: node.name }))

  if (unitNodeId) {
    const unit = nodeById(tree, unitNodeId)
    const unitLayer = unit ? layerById(tree, unit.layerId) : undefined
    if (unit && unitLayer) {
      if (layer.sortOrder === unitLayer.sortOrder + 1) {
        return toOptions([unit])
      }

      const underUnit = toOptions(nodesUnderUnitAtLayer(tree, unitNodeId, parentLayer.id))
      if (underUnit.length > 0) return underUnit
    }
  }

  return toOptions(parentOptionsForLayer(tree, layer))
}

export function resolveLayerParentId(
  options: StructureParentOption[],
  preferredParentId?: string | null,
): string | null {
  if (options.length === 0) return null
  if (options.length === 1) return options[0].id
  if (preferredParentId && options.some((option) => option.id === preferredParentId)) {
    return preferredParentId
  }
  return options[0].id
}

export function layerRequiresParent(tree: StructureTree, layer: StructureLayer): boolean {
  return layer.sortOrder > 0 && parentLayerForLayer(tree, layer) !== undefined
}

export function parentOptionsForLayer(tree: StructureTree, layer: StructureLayer) {
  if (layer.sortOrder === 0) return []
  const parentLayer = parentLayerForLayer(tree, layer)
  if (!parentLayer) return []
  return nodesAtLayer(tree, parentLayer.id)
}

/** Church-wide roster tab: unlocked when every layer above has at least one unit. */
export function isRosterLayerUnlocked(tree: StructureTree, layer: StructureLayer): boolean {
  if (layer.sortOrder === 0) return true
  const parentLayer = parentLayerForLayer(tree, layer)
  if (!parentLayer) return true
  return nodesAtLayer(tree, parentLayer.id).length > 0
}

export function rosterLayerLockReason(tree: StructureTree, layer: StructureLayer): string | null {
  if (isRosterLayerUnlocked(tree, layer)) return null
  const parentLayer = parentLayerForLayer(tree, layer)
  return parentLayer ? `Add a ${parentLayer.displayName.toLowerCase()} first` : null
}

/** Unit drill-down tab: child layers unlock in order under this unit. */
export function isUnitChildLayerUnlocked(
  tree: StructureTree,
  unitNodeId: string,
  layer: StructureLayer,
): boolean {
  const childLayers = childLayersFromUnit(tree, unitNodeId)
  const index = childLayers.findIndex((child) => child.id === layer.id)
  if (index <= 0) return true
  const previousLayer = childLayers[index - 1]
  return nodesUnderUnitAtLayer(tree, unitNodeId, previousLayer.id).length > 0
}

export function unitChildLayerLockReason(
  tree: StructureTree,
  unitNodeId: string,
  layer: StructureLayer,
): string | null {
  if (isUnitChildLayerUnlocked(tree, unitNodeId, layer)) return null
  const childLayers = childLayersFromUnit(tree, unitNodeId)
  const index = childLayers.findIndex((child) => child.id === layer.id)
  const previousLayer = index > 0 ? childLayers[index - 1] : undefined
  return previousLayer
    ? `Add a ${previousLayer.displayName.toLowerCase()} under this unit first`
    : null
}

export function memberPlacementOptions(tree: StructureTree) {
  const deepest = getDeepestLayer(tree)
  if (!deepest) return []

  return nodesAtLayer(tree, deepest.id).map((node) => {
    const chain = parentChain(tree, node.id)
    const path = chain.map((n) => n.name).join(' / ')
    return { id: node.id, label: path }
  })
}

/** Nodes at a layer that can receive a member, filtered by the parent chosen on the previous step. */
export function memberPlacementNodesForLayer(
  tree: StructureTree,
  layerId: string,
  parentNodeId: string | null,
): StructureNode[] {
  const layer = layerById(tree, layerId)
  if (!layer) return []

  const atLayer = nodesAtLayer(tree, layerId).sort((a, b) => {
    const aNum = Number.parseInt(displayUnitNumber(tree, a.id), 10)
    const bNum = Number.parseInt(displayUnitNumber(tree, b.id), 10)
    if (!Number.isNaN(aNum) && !Number.isNaN(bNum) && aNum !== bNum) return aNum - bNum
    return a.name.localeCompare(b.name) || a.id.localeCompare(b.id)
  })

  if (layer.sortOrder === 0) {
    return atLayer.filter((node) => node.parentNodeId === null)
  }

  if (!parentNodeId) return []

  return atLayer.filter((node) => node.parentNodeId === parentNodeId)
}

export function memberBelongsToUnit(
  tree: StructureTree,
  unitNodeId: string,
  memberParentNodeId: string,
) {
  if (memberParentNodeId === unitNodeId) return true
  return isDescendantOf(tree, unitNodeId, memberParentNodeId)
}

export function placementOptionsForUnit(tree: StructureTree, unitNodeId: string) {
  const deepest = getDeepestLayer(tree)
  if (!deepest) return []

  const unit = nodeById(tree, unitNodeId)
  if (!unit) return []

  return nodesAtLayer(tree, deepest.id)
    .filter((cell) => cell.id === unitNodeId || isDescendantOf(tree, unitNodeId, cell.id))
    .map((node) => {
      const chain = parentChain(tree, node.id)
      const path = chain.map((n) => n.name).join(' / ')
      return { id: node.id, label: path }
    })
}

export function defaultMemberPlacementForUnit(tree: StructureTree, unitNodeId: string) {
  const deepest = getDeepestLayer(tree)
  const unit = nodeById(tree, unitNodeId)
  if (!deepest || !unit) return ''

  if (unit.layerId === deepest.id) return unit.id

  const placements = placementOptionsForUnit(tree, unitNodeId)
  return placements.length === 1 ? placements[0].id : ''
}

export function countCellsUnderUnit(tree: StructureTree, unitNodeId: string) {
  const deepest = getDeepestLayer(tree)
  if (!deepest) return 0

  return nodesAtLayer(tree, deepest.id).filter(
    (cell) => cell.id === unitNodeId || isDescendantOf(tree, unitNodeId, cell.id),
  ).length
}

export function childLayersFromUnit(tree: StructureTree, unitNodeId: string) {
  const unit = nodeById(tree, unitNodeId)
  if (!unit) return []
  const unitLayer = layerById(tree, unit.layerId)
  if (!unitLayer) return []
  return getLayers(tree).filter((layer) => layer.sortOrder > unitLayer.sortOrder)
}

export function directChildLayer(tree: StructureTree, unitNodeId: string) {
  const unit = nodeById(tree, unitNodeId)
  if (!unit) return null
  const unitLayer = layerById(tree, unit.layerId)
  if (!unitLayer) return null
  return getLayers(tree).find((layer) => layer.sortOrder === unitLayer.sortOrder + 1) ?? null
}

export function nodesUnderUnitAtLayer(
  tree: StructureTree,
  unitNodeId: string,
  layerId: string,
) {
  return nodesAtLayer(tree, layerId).filter(
    (node) => node.id === unitNodeId || isDescendantOf(tree, unitNodeId, node.id),
  )
}

export function countMembersUnderUnit(tree: StructureTree, unitNodeId: string) {
  return tree.members.filter((member) => memberBelongsToUnit(tree, unitNodeId, member.parentNodeId))
    .length
}

export function memberStructureSegments(tree: StructureTree, memberParentNodeId: string) {
  return parentChain(tree, memberParentNodeId).map((node) => {
    const nodeLayer = layerById(tree, node.layerId)
    if (!nodeLayer) {
      return {
        layerId: node.layerId,
        layerName: 'Unit',
        standardType: 'Cell',
        nodeName: node.name,
      }
    }

    return {
      layerId: node.layerId,
      layerName: nodeLayer.displayName,
      standardType: nodeLayer.standardType,
      nodeName: node.name,
    }
  })
}

export function unitDetailTabs(tree: StructureTree, unitNodeId: string) {
  const childLayers = childLayersFromUnit(tree, unitNodeId)
  return [
    ...childLayers.map((layer) => ({
      id: layer.id,
      kind: 'layer' as const,
      label: layer.displayName,
      layer,
      count: nodesUnderUnitAtLayer(tree, unitNodeId, layer.id).length,
    })),
    {
      id: 'members',
      kind: 'members' as const,
      label: 'Members',
      count: countMembersUnderUnit(tree, unitNodeId),
    },
  ]
}

export function layerBadgeClass(standardType: string) {
  return (
    LAYER_BADGE_CLASS[standardType] ??
    'border-border/60 bg-muted/40 text-muted-foreground'
  )
}

const LAYER_BADGE_CLASS: Record<string, string> = {
  Group: 'border-violet-200/80 bg-violet-500/10 text-violet-700',
  PFCC: 'border-blue-200/80 bg-blue-500/10 text-blue-700',
  Fellowship: 'border-emerald-200/80 bg-emerald-500/10 text-emerald-700',
  Cell: 'border-amber-200/80 bg-amber-500/10 text-amber-700',
}

export function leaderPositionForLayer(standardType: StructureLayerType): MemberPosition {
  switch (standardType) {
    case 'PFCC':
      return 'PfccManager'
    case 'Fellowship':
      return 'FellowshipLeader'
    case 'Cell':
      return 'CellLeader'
    default:
      return 'Member'
  }
}

export function resolveNodeLeader(
  tree: StructureTree,
  nodeId: string,
): { leaderMemberId: string; leaderName: string } {
  const node = nodeById(tree, nodeId)
  if (!node) return { leaderMemberId: '', leaderName: '' }

  const leaderMemberId = node.leaderMemberId ?? ''
  if (node.leaderName) {
    return { leaderMemberId, leaderName: node.leaderName }
  }

  if (leaderMemberId) {
    const linked = tree.members.find((member) => member.id === leaderMemberId)
    if (linked) {
      return { leaderMemberId, leaderName: linked.name }
    }
  }

  const layer = layerById(tree, node.layerId)
  if (!layer || layer.standardType === 'Group') {
    return { leaderMemberId: '', leaderName: '' }
  }

  const expectedPosition = leaderPositionForLayer(layer.standardType)
  if (expectedPosition === 'Member') {
    return { leaderMemberId: '', leaderName: '' }
  }

  const deepest = getDeepestLayer(tree)
  const candidates =
    deepest?.id === node.layerId
      ? tree.members.filter((member) => member.parentNodeId === node.id)
      : membersUnderUnit(tree, node.id)

  const leader = candidates.find((member) => member.position === expectedPosition)
  if (!leader) {
    return { leaderMemberId: '', leaderName: '' }
  }

  return { leaderMemberId: leader.id, leaderName: leader.name }
}

export function membersUnderUnit(tree: StructureTree, unitNodeId: string) {
  return tree.members.filter((member) => memberBelongsToUnit(tree, unitNodeId, member.parentNodeId))
}

export type UnitDeleteImpact = {
  nodeId: string
  unitName: string
  layerName: string
  childUnits: { layerName: string; count: number }[]
  memberCount: number
}

export function subtreeNodeIds(tree: StructureTree, rootNodeId: string): Set<string> {
  const ids = new Set<string>([rootNodeId])
  const queue = [rootNodeId]

  while (queue.length > 0) {
    const parentId = queue.pop()!
    for (const node of tree.nodes) {
      if (node.parentNodeId === parentId && !ids.has(node.id)) {
        ids.add(node.id)
        queue.push(node.id)
      }
    }
  }

  return ids
}

export function unitDeleteImpact(tree: StructureTree, nodeId: string): UnitDeleteImpact | null {
  const node = nodeById(tree, nodeId)
  const layer = node ? layerById(tree, node.layerId) : undefined
  if (!node || !layer) return null

  const ids = subtreeNodeIds(tree, nodeId)
  const childUnits = getLayers(tree)
    .map((entry) => ({
      layerName:
        layer.standardType === 'Fellowship' && entry.standardType === 'Cell'
          ? 'Cells'
          : entry.displayName,
      count: tree.nodes.filter((n) => n.layerId === entry.id && ids.has(n.id) && n.id !== nodeId)
        .length,
    }))
    .filter((entry) => entry.count > 0)

  const memberCount = tree.members.filter((member) => ids.has(member.parentNodeId)).length

  return {
    nodeId,
    unitName: node.name,
    layerName: layer.standardType === 'Fellowship' ? 'Fellowship' : layer.displayName,
    childUnits,
    memberCount,
  }
}

export function roleBadgeClass(position: string) {
  if (position === 'CellLeader') return 'border-amber-200/80 bg-amber-500/10 text-amber-800'
  if (position === 'FellowshipLeader') return 'border-emerald-200/80 bg-emerald-500/10 text-emerald-800'
  if (position === 'PfccManager') return 'border-blue-200/80 bg-blue-500/10 text-blue-800'
  return 'border-border/60 bg-muted/30 text-muted-foreground'
}

export function formatMemberPosition(position: string) {
  return MEMBER_POSITION_LABELS[position] ?? position
}

const MEMBER_POSITION_LABELS: Record<string, string> = {
  Member: 'Member',
  CellLeader: 'Cell leader',
  FellowshipLeader: 'Fellowship leader',
  PfccManager: 'PFCC manager',
}

export function formatFellowshipName(raw: string): string {
  return formatLayerUnitName(raw, 'Fellowship')
}

export function formatCellName(raw: string): string {
  return formatLayerUnitName(raw, 'Cell')
}

function formatLayerUnitName(raw: string, suffixWord: string): string {
  const trimmed = raw.trim().replace(/\s+/g, ' ')
  if (!trimmed) return trimmed

  const suffixPattern = new RegExp(`\\b${suffixWord}$`, 'i')
  if (suffixPattern.test(trimmed)) {
    return titleCaseWords(trimmed)
  }

  return `${titleCaseWords(trimmed)} ${suffixWord}`
}

function titleCaseWords(value: string): string {
  return value
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

export function formatApiError(err: unknown): string {
  if (err instanceof ApiError) {
    const body = err.body as { error?: string } | undefined
    if (body?.error) return body.error
    return err.message
  }
  if (err instanceof Error) return err.message
  return 'Something went wrong'
}
