import type { MemberPosition, StructureLayer, StructureLayerType, StructureNode, StructureTree } from '@/api/structure'
import { ApiError } from '@/api/client'

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
  let current = nodeById(tree, nodeId)
  while (current?.parentNodeId) {
    if (current.parentNodeId === ancestorId) return true
    current = nodeById(tree, current.parentNodeId)
  }
  return false
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

export function parentOptionsForLayer(tree: StructureTree, layer: StructureLayer) {
  if (layer.sortOrder === 0) return []
  const parentLayer = getLayers(tree)[layer.sortOrder - 1]
  if (!parentLayer) return []
  return nodesAtLayer(tree, parentLayer.id)
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
      layerName: entry.displayName,
      count: tree.nodes.filter((n) => n.layerId === entry.id && ids.has(n.id) && n.id !== nodeId).length,
    }))
    .filter((entry) => entry.count > 0)

  const memberCount = tree.members.filter((member) => ids.has(member.parentNodeId)).length

  return {
    nodeId,
    unitName: node.name,
    layerName: layer.displayName,
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

export function formatApiError(err: unknown): string {
  if (err instanceof ApiError) {
    const body = err.body as { error?: string } | undefined
    if (body?.error) return body.error
    return err.message
  }
  if (err instanceof Error) return err.message
  return 'Something went wrong'
}
