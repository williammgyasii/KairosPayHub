import type { StructureLayer, StructureNode, StructureTree } from '@/api/structure'
import { actorLeadershipFromRole, type ActorLeadership } from '@/lib/member-role-policy'
import {
  getLayers,
  isDescendantOf,
  layerById,
  nodeById,
  nodesAtLayer,
} from '@/shared/lib/structure-tree'

export type GivingLeadership = ActorLeadership

export type GivingScopeLayerOption = {
  layerId: string
  label: string
}

export type GivingScopeUnitOption = {
  id: string
  name: string
}

export type GivingScopeParent = {
  scopeKind: string
  scopeNodeId: string | null
}

export type GivingScopePolicy = {
  leadership: GivingLeadership
  canCreateCampaign: boolean
  canCreateSubCampaign: boolean
  canBulkLog: boolean
  allowChurchWide: boolean
  churchWideLabel: string
  layers: GivingScopeLayerOption[]
  unitsForLayer: (layerId: string) => GivingScopeUnitOption[]
  remittanceApproverLabel: string
}

export function leadershipFromProfile(
  profile?: string | null,
  role?: string | null,
): GivingLeadership {
  const normalized = profile?.trim().toLowerCase()
  if (normalized === 'churchwide') return 'churchWide'
  if (normalized === 'intermediate') return 'intermediate'
  if (normalized === 'leaf') return 'leaf'
  if (normalized === 'member') return 'member'
  return actorLeadershipFromRole(role ?? 'Member')
}

function layersAtOrBelow(
  tree: StructureTree,
  anchorLayer: StructureLayer | undefined,
): StructureLayer[] {
  const layers = getLayers(tree)
  if (!anchorLayer) return layers
  return layers.filter((layer) => layer.sortOrder >= anchorLayer.sortOrder)
}

function unitInScope(
  tree: StructureTree,
  unit: StructureNode,
  rootNodeId: string | null | undefined,
): boolean {
  if (!rootNodeId) return true
  return unit.id === rootNodeId || isDescendantOf(tree, rootNodeId, unit.id)
}

function remittanceLabel(tree: StructureTree, actorScopeNodeId?: string | null): string {
  if (!actorScopeNodeId) return 'level above'
  const scopeNode = nodeById(tree, actorScopeNodeId)
  if (!scopeNode?.parentNodeId) return 'church leadership'
  const parent = nodeById(tree, scopeNode.parentNodeId)
  if (!parent) return 'level above'
  const parentLayer = layerById(tree, parent.layerId)
  return parentLayer?.displayName ?? 'level above'
}

export function givingScopePolicy(input: {
  tree: StructureTree
  actorLeadership: GivingLeadership
  actorScopeNodeId?: string | null
  parent?: GivingScopeParent | null
}): GivingScopePolicy {
  const { tree, actorLeadership, actorScopeNodeId = null, parent = null } = input
  const canCreate = actorLeadership === 'churchWide' || actorLeadership === 'intermediate'
  // Spec: bulk-log = intermediate only; leaf = single member; church-wide does not log.
  const canBulkLog = actorLeadership === 'intermediate'

  const parentNode = parent?.scopeNodeId ? nodeById(tree, parent.scopeNodeId) : undefined
  const parentLayer = parentNode ? layerById(tree, parentNode.layerId) : undefined
  const actorNode = actorScopeNodeId ? nodeById(tree, actorScopeNodeId) : undefined
  const actorLayer = actorNode ? layerById(tree, actorNode.layerId) : undefined

  const parentIsChurchWide =
    !parent || parent.scopeKind === 'ChurchWide' || !parent.scopeNodeId

  let rootConstraint: string | null = null
  if (parentNode) rootConstraint = parentNode.id
  if (actorLeadership !== 'churchWide' && actorScopeNodeId) {
    if (!rootConstraint) rootConstraint = actorScopeNodeId
    else if (
      rootConstraint !== actorScopeNodeId &&
      !isDescendantOf(tree, actorScopeNodeId, rootConstraint) &&
      isDescendantOf(tree, rootConstraint, actorScopeNodeId)
    ) {
      rootConstraint = actorScopeNodeId
    }
  }

  const anchorLayer =
    parentLayer ?? (actorLeadership === 'churchWide' ? undefined : actorLayer)
  const availableLayers = layersAtOrBelow(tree, anchorLayer)

  const allowChurchWide =
    canCreate && actorLeadership === 'churchWide' && parentIsChurchWide

  return {
    leadership: actorLeadership,
    canCreateCampaign: canCreate,
    canCreateSubCampaign: canCreate,
    canBulkLog,
    allowChurchWide,
    churchWideLabel: 'Church-wide',
    layers: availableLayers.map((layer) => ({
      layerId: layer.id,
      label: layer.displayName,
    })),
    unitsForLayer: (layerId: string) =>
      nodesAtLayer(tree, layerId)
        .filter((unit) => unitInScope(tree, unit, rootConstraint))
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((unit) => ({ id: unit.id, name: unit.name })),
    remittanceApproverLabel: remittanceLabel(tree, actorScopeNodeId),
  }
}
