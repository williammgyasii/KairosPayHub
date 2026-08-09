import type { StructureTree } from '@/api/structure'
import type { MemberPosition } from '@/api/structure'
import { formatMemberAge } from '@/lib/member-age'
import {
  getDeepestLayer,
  getLayers,
  isDescendantOf,
  layerById,
  memberStructureSegments,
  nodeById,
  nodesAtLayer,
  parentChain,
  formatMemberPosition,
  resolveNodeLeader,
  displayUnitNumber,
} from '@/lib/structure-tree'

export type StructureSegment = {
  layerId: string
  layerName: string
  standardType: string
  nodeName: string
}

export type StructureDefinitionRow = {
  id: string
  order: number
  standardType: string
  displayName: string
}

export function buildDefinitionRows(tree: StructureTree): StructureDefinitionRow[] {
  return getLayers(tree).map((layer) => ({
    id: layer.id,
    order: layer.sortOrder + 1,
    standardType: layer.standardType,
    displayName: layer.displayName,
  }))
}

export type StructureMemberRow = {
  id: string
  member: string
  email: string
  phone: string
  dateOfBirth: string
  residence: string
  occupationStatus: string
  schoolOrWorkplace: string
  age: string
  role: string
  path: string
  parentNodeId: string
  position: MemberPosition
  responsiveness: number
  structure: StructureSegment[]
}

export type StructureUnitNodeRow = {
  id: string
  name: string
  unitNumber: string
  leaderMemberId: string
  leaderName: string
  memberCount: number
  childUnitCount: number
  parentSegment: StructureSegment | null
  pathSegments: StructureSegment[]
  layerId: string
}

export type StructureNodeRow = {
  id: string
  name: string
  parent: string
  memberCount: number
}

export function buildMemberRows(tree: StructureTree): StructureMemberRow[] {
  return tree.members
    .map((m) => {
      const structure = memberStructureSegments(tree, m.parentNodeId)
      const path = structure.map((s) => s.nodeName).join(' / ') || '—'
      return {
        id: m.id,
        member: m.name,
        email: m.email ?? '',
        phone: m.phone ?? '',
        dateOfBirth: m.dateOfBirth ?? '',
        residence: m.residence ?? '',
        occupationStatus: m.occupationStatus ?? '',
        schoolOrWorkplace: m.schoolOrWorkplace ?? '',
        age: formatMemberAge(m.dateOfBirth, m.age),
        role: formatMemberPosition(m.position),
        path,
        parentNodeId: m.parentNodeId,
        position: (m.position as MemberPosition) || 'Member',
        responsiveness: m.responsiveness ?? 3,
        structure,
      }
    })
    .sort((a, b) => a.member.localeCompare(b.member))
}

export function buildUnitNodeRows(
  tree: StructureTree,
  unitNodeId: string,
  layerId: string,
): StructureUnitNodeRow[] {
  const deepest = getDeepestLayer(tree)
  const unit = nodeById(tree, unitNodeId)
  const unitLayer = unit ? layerById(tree, unit.layerId) : undefined
  const targetLayer = layerById(tree, layerId)
  const childLayer = getLayers(tree).find((l) => l.sortOrder === (targetLayer?.sortOrder ?? -1) + 1)

  return nodesAtLayer(tree, layerId)
    .filter((node) => node.id === unitNodeId || isDescendantOf(tree, unitNodeId, node.id))
    .map((node) => {
      const chain = parentChain(tree, node.id)
      const pathSegments =
        unitLayer == null
          ? chain.map((n) => {
              const layer = layerById(tree, n.layerId)!
              return {
                layerId: layer.id,
                layerName: layer.displayName,
                standardType: layer.standardType,
                nodeName: n.name,
              }
            })
          : chain
              .filter((n) => {
                const layer = layerById(tree, n.layerId)
                return layer != null && layer.sortOrder > unitLayer.sortOrder && n.id !== node.id
              })
              .map((n) => {
                const layer = layerById(tree, n.layerId)!
                return {
                  layerId: layer.id,
                  layerName: layer.displayName,
                  standardType: layer.standardType,
                  nodeName: n.name,
                }
              })

      const parentNode = node.parentNodeId ? nodeById(tree, node.parentNodeId) : undefined
      const parentLayer = parentNode ? layerById(tree, parentNode.layerId) : undefined
      const parentSegment =
        parentNode && parentLayer
          ? {
              layerId: parentLayer.id,
              layerName: parentLayer.displayName,
              standardType: parentLayer.standardType,
              nodeName: parentNode.name,
            }
          : null

      const memberCount =
        deepest?.id === layerId
          ? tree.members.filter((m) => m.parentNodeId === node.id).length
          : tree.members.filter((m) => isDescendantOf(tree, node.id, m.parentNodeId)).length

      const childUnitCount = childLayer
        ? nodesAtLayer(tree, childLayer.id).filter((n) => isDescendantOf(tree, node.id, n.id)).length
        : 0

      const leader = resolveNodeLeader(tree, node.id)

      return {
        id: node.id,
        name: node.name,
        unitNumber: displayUnitNumber(tree, node.id),
        leaderMemberId: leader.leaderMemberId,
        leaderName: leader.leaderName,
        memberCount,
        childUnitCount,
        parentSegment,
        pathSegments,
        layerId,
      }
    })
    .sort((a, b) => {
      const aNum = Number.parseInt(a.unitNumber, 10)
      const bNum = Number.parseInt(b.unitNumber, 10)
      if (!Number.isNaN(aNum) && !Number.isNaN(bNum) && aNum !== bNum) return aNum - bNum
      if (!Number.isNaN(aNum)) return -1
      if (!Number.isNaN(bNum)) return 1
      return a.name.localeCompare(b.name)
    })
}

export function buildNodeRows(tree: StructureTree, layerId: string): StructureNodeRow[] {
  const deepest = getDeepestLayer(tree)
  return nodesAtLayer(tree, layerId)
    .map((node) => {
      const parent = node.parentNodeId
        ? (nodeById(tree, node.parentNodeId)?.name ?? '—')
        : tree.churchName
      const memberCount =
        deepest?.id === layerId
          ? tree.members.filter((m) => m.parentNodeId === node.id).length
          : tree.members.filter((m) => isDescendantOf(tree, node.id, m.parentNodeId)).length
      return {
        id: node.id,
        name: node.name,
        parent,
        memberCount,
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function hasDesignedStructure(tree: StructureTree | null) {
  if (!tree) return false
  return tree.nodes.length > 0 || tree.members.length > 0
}

export function layerTabs(tree: StructureTree) {
  const layers = getLayers(tree)
  return [
    { id: 'members' as const, label: 'Members', count: tree.members.length },
    ...layers.map((layer) => ({
      id: layer.id as string,
      label: layer.displayName,
      count: nodesAtLayer(tree, layer.id).length,
      layer,
    })),
  ]
}

export type LayerTab = ReturnType<typeof layerTabs>[number]

export function fellowshipBreakdownRows(tree: StructureTree) {
  const fellowshipLayer = getLayers(tree).find((l) => l.standardType === 'Fellowship')
  const cellLayer = getDeepestLayer(tree)
  if (!fellowshipLayer || !cellLayer || cellLayer.standardType !== 'Cell') return []

  return nodesAtLayer(tree, fellowshipLayer.id).map((f) => {
    const cells = nodesAtLayer(tree, cellLayer.id).filter((c) =>
      isDescendantOf(tree, f.id, c.id),
    )
    const members = tree.members.filter((m) => cells.some((c) => c.id === m.parentNodeId)).length
    return { id: f.id, name: f.name, cells: cells.length, members }
  })
}

export { layerById, getLayers, nodesAtLayer }
