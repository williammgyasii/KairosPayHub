import type { StructureLayer, StructureTree } from '@/api/structure'
import type { StructureParentOption } from '@/shared/lib/structure-tree'
import {
  directChildLayer,
  getDeepestLayer,
  layerParentOptions,
  layerRequiresParent,
  parentLayerForLayer,
  resolveLayerParentId,
} from '@/shared/lib/structure-tree'

export type CreateUnitActor = {
  hasCreateChildUnits: boolean
  churchWide: boolean
  actorScopeNodeId?: string | null
}

export type CreateUnitPolicyLabels = {
  layerName: string
  parentLayerName: string | null
  deepestLayerName: string
  title: string
  submitLabel: string
  firstChildStepLabel: string | null
}

export type CreateUnitPolicy = {
  canAdd: boolean
  blockedReason: string | null
  parentRequired: boolean
  parentOptions: StructureParentOption[]
  defaultParentId: string | null
  includeFirstChildStep: boolean
  includeLeaderStep: boolean
  labels: CreateUnitPolicyLabels
}

function layerPhrase(displayName: string): string {
  return displayName.toLowerCase()
}

export function createUnitPolicy(
  tree: StructureTree,
  layer: StructureLayer,
  scopeUnitId?: string | null,
  actor?: CreateUnitActor | null,
): CreateUnitPolicy {
  const parentLayer = parentLayerForLayer(tree, layer)
  const deepest = getDeepestLayer(tree)
  const parentRequired = layerRequiresParent(tree, layer)
  const parentOptions = layerParentOptions(tree, layer, scopeUnitId)
  const defaultParentId = parentRequired
    ? resolveLayerParentId(parentOptions, scopeUnitId)
    : null
  const includeLeaderStep = true
  const placementOk = !parentRequired || parentOptions.length > 0
  const actorAllows = actorAllowsLayer(tree, layer, actor)
  const canAdd = placementOk && actorAllows
  const blockedReason =
    placementOk || !parentLayer ? null : `Add a ${layerPhrase(parentLayer.displayName)} first`

  return {
    canAdd,
    blockedReason,
    parentRequired,
    parentOptions,
    defaultParentId,
    includeFirstChildStep: false,
    includeLeaderStep,
    labels: {
      layerName: layer.displayName,
      parentLayerName: parentLayer?.displayName ?? null,
      deepestLayerName: deepest?.displayName ?? layer.displayName,
      title: `Add ${layerPhrase(layer.displayName)}`,
      submitLabel: `Create ${layerPhrase(layer.displayName)}`,
      firstChildStepLabel: null,
    },
  }
}

function actorAllowsLayer(
  tree: StructureTree,
  layer: StructureLayer,
  actor?: CreateUnitActor | null,
): boolean {
  if (!actor) return true
  if (!actor.hasCreateChildUnits) return false
  if (actor.churchWide) return true
  if (!actor.actorScopeNodeId) return false
  return directChildLayer(tree, actor.actorScopeNodeId)?.id === layer.id
}
