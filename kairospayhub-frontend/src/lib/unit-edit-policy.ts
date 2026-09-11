import type { StructureTree } from '@/api/structure'
import { directChildLayer, isDescendantOf, nodeById } from '@/shared/lib/structure-tree'

/** Who may edit or delete a structure unit — policy, not screen string gates. */

export type UnitEditPolicy = {
  canRename: boolean
  canChangeLeader: boolean
  canDelete: boolean
  /** Full form: unit number + leadership. */
  renameOnly: boolean
}

export function unitEditPolicy(input: {
  tree: StructureTree
  canManageChurch: boolean
  hasCreateChildUnits?: boolean
  actorScopeNodeId?: string | null
  unitId: string
}): UnitEditPolicy {
  if (input.canManageChurch) {
    return { canRename: true, canChangeLeader: true, canDelete: true, renameOnly: false }
  }

  if (input.actorScopeNodeId && input.actorScopeNodeId === input.unitId) {
    return { canRename: true, canChangeLeader: false, canDelete: false, renameOnly: true }
  }

  return {
    canRename: false,
    canChangeLeader: false,
    canDelete: canDeleteChildInScope(input),
    renameOnly: false,
  }
}

function canDeleteChildInScope(input: {
  tree: StructureTree
  hasCreateChildUnits?: boolean
  actorScopeNodeId?: string | null
  unitId: string
}): boolean {
  if (!input.hasCreateChildUnits || !input.actorScopeNodeId) return false
  const unit = nodeById(input.tree, input.unitId)
  if (!unit) return false
  if (unit.id === input.actorScopeNodeId) return false
  if (!isDescendantOf(input.tree, input.actorScopeNodeId, unit.id)) return false
  return directChildLayer(input.tree, input.actorScopeNodeId)?.id === unit.layerId
}

export function unitEditMenuLabel(layerDisplayName: string): string {
  return `Edit ${layerDisplayName.toLowerCase()}`
}
