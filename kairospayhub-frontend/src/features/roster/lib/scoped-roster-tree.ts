import {
  canManageChurch,
  isCellLeader,
  isScopedLeader,
  rollCallScopesFor,
  rosterScopeRootNodeId,
} from '@/api/auth'
import type { StructureTree } from '@/api/structure'
import { hasProductAbility, PRODUCT_ABILITIES } from '@/shared/lib/abilities'
import { filterTreeToSubtree } from '@/shared/lib/structure-tree'
import type { CreateUnitActor } from '@/shared/lib/create-unit-policy'
import type { DashboardOutletContext } from '@/shared/layout/dashboard-layout'

export function scopedRosterTree(
  tree: StructureTree | null,
  me: DashboardOutletContext['me'],
) {
  if (!tree) return tree
  if (canManageChurch(me.role)) return tree
  if (isCellLeader(me.role)) {
    const cellScopeId = rollCallScopesFor(me)[0]?.scopeNodeId ?? me.scopeNodeId ?? null
    return cellScopeId ? filterTreeToSubtree(tree, cellScopeId) : tree
  }
  if (isScopedLeader(me.role) && me.scopeNodeId) {
    return filterTreeToSubtree(tree, me.scopeNodeId)
  }
  return tree
}

export function rosterCreateActor(me: DashboardOutletContext['me']): CreateUnitActor {
  return {
    hasCreateChildUnits: hasProductAbility(me.abilities, PRODUCT_ABILITIES.createChildUnits),
    churchWide: canManageChurch(me.role),
    actorScopeNodeId: rosterScopeRootNodeId(me),
  }
}
