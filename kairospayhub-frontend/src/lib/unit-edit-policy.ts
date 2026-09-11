/** Who may edit a structure unit — policy, not screen string gates. */

export type UnitEditPolicy = {
  canRename: boolean
  canChangeLeader: boolean
  /** Full form: unit number + leadership. */
  renameOnly: boolean
}

export function unitEditPolicy(input: {
  canManageChurch: boolean
  actorScopeNodeId?: string | null
  unitId: string
}): UnitEditPolicy {
  if (input.canManageChurch) {
    return { canRename: true, canChangeLeader: true, renameOnly: false }
  }

  if (input.actorScopeNodeId && input.actorScopeNodeId === input.unitId) {
    return { canRename: true, canChangeLeader: false, renameOnly: true }
  }

  return { canRename: false, canChangeLeader: false, renameOnly: false }
}

export function unitEditMenuLabel(layerDisplayName: string): string {
  return `Edit ${layerDisplayName.toLowerCase()}`
}
