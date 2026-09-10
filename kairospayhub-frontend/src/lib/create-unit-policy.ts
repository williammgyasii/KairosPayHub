import type { StructureLayer, StructureTree } from '@/api/structure'
import type { StructureParentOption } from '@/lib/structure-tree'
import {
  getDeepestLayer,
  layerParentOptions,
  layerRequiresParent,
  parentLayerForLayer,
  resolveLayerParentId,
} from '@/lib/structure-tree'

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
  labels: CreateUnitPolicyLabels
}

function layerPhrase(displayName: string): string {
  return displayName.toLowerCase()
}

export function createUnitPolicy(
  tree: StructureTree,
  layer: StructureLayer,
  scopeUnitId?: string | null,
): CreateUnitPolicy {
  const parentLayer = parentLayerForLayer(tree, layer)
  const deepest = getDeepestLayer(tree)
  const parentRequired = layerRequiresParent(tree, layer)
  const parentOptions = layerParentOptions(tree, layer, scopeUnitId)
  const defaultParentId = parentRequired
    ? resolveLayerParentId(parentOptions, scopeUnitId)
    : null
  const includeFirstChildStep = Boolean(deepest && deepest.id !== layer.id)
  const canAdd = !parentRequired || parentOptions.length > 0
  const blockedReason =
    canAdd || !parentLayer ? null : `Add a ${layerPhrase(parentLayer.displayName)} first`

  return {
    canAdd,
    blockedReason,
    parentRequired,
    parentOptions,
    defaultParentId,
    includeFirstChildStep,
    labels: {
      layerName: layer.displayName,
      parentLayerName: parentLayer?.displayName ?? null,
      deepestLayerName: deepest?.displayName ?? layer.displayName,
      title: `Add ${layerPhrase(layer.displayName)}`,
      submitLabel: `Create ${layerPhrase(layer.displayName)}`,
      firstChildStepLabel: includeFirstChildStep
        ? `First ${layerPhrase(deepest?.displayName ?? 'unit')}`
        : null,
    },
  }
}
