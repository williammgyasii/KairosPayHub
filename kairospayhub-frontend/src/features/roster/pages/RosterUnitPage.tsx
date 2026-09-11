import { useEffect, useMemo } from 'react'
import { useOutletContext, useParams } from 'react-router-dom'
import { canManageChurch, canManageMembers, rosterScopeRootNodeId } from '@/api/auth'
import { useStructureTree } from '@/shared/lib/use-structure-tree'
import { rosterCreateActor, scopedRosterTree } from '@/features/roster/lib/scoped-roster-tree'
import { RosterEmptyState } from '@/features/roster/components/roster-view'
import { RosterUnitView } from '@/features/roster/components/roster-unit-view'
import { hasTemplate } from '@/lib/structure-dashboard'
import type { DashboardOutletContext } from '@/shared/layout/dashboard-layout'
import { Spinner } from '@/shared/ui/spinner'

export function RosterUnitPage() {
  const { me } = useOutletContext<DashboardOutletContext>()
  const { nodeId } = useParams<{ nodeId: string }>()
  const { tree, error, busy, loading, load, submit } = useStructureTree()
  const structureReadOnly = !canManageChurch(me.role)
  const membersReadOnly = !canManageMembers(me)
  const displayTree = useMemo(() => scopedRosterTree(tree, me), [tree, me])

  useEffect(() => {
    void load()
  }, [load])

  if (loading && !tree) {
    return <Spinner label="Loading unit…" />
  }

  if (!displayTree) {
    return <p className="text-sm text-destructive">{error ?? 'Could not load unit.'}</p>
  }

  if (!hasTemplate(displayTree) || !nodeId) {
    return <RosterEmptyState />
  }

  return (
    <RosterUnitView
      tree={displayTree}
      unitNodeId={nodeId}
      error={error}
      busy={busy}
      submit={submit}
      readOnly={structureReadOnly}
      membersReadOnly={membersReadOnly}
      scopeRootNodeId={rosterScopeRootNodeId(me)}
      canManageChurch={canManageChurch(me.role)}
      actorScopeNodeId={rosterScopeRootNodeId(me)}
      createActor={rosterCreateActor(me)}
      currentMemberId={me.onboarded ? me.memberId : null}
    />
  )
}
