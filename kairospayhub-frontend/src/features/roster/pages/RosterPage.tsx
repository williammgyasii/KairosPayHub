import { useEffect, useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'
import { canManageChurch, rosterScopeRootNodeId } from '@/api/auth'
import { useStructureTree } from '@/shared/lib/use-structure-tree'
import { rosterCreateActor, scopedRosterTree } from '@/features/roster/lib/scoped-roster-tree'
import { RosterEmptyState, RosterView } from '@/features/roster/components/roster-view'
import { hasTemplate } from '@/lib/structure-dashboard'
import type { DashboardOutletContext } from '@/shared/layout/dashboard-layout'
import { DashboardPageHeader } from '@/shared/layout/dashboard-page-header'
import { getLayers } from '@/shared/lib/structure-tree'
import { Spinner } from '@/shared/ui/spinner'

export function RosterPage() {
  const { me } = useOutletContext<DashboardOutletContext>()
  const { tree, error, busy, loading, load, submit } = useStructureTree()
  const readOnly = !canManageChurch(me.role)
  const displayTree = useMemo(() => scopedRosterTree(tree, me), [tree, me])

  useEffect(() => {
    void load()
  }, [load])

  if (loading && !tree) {
    return <Spinner label="Loading roster…" />
  }

  if (!displayTree) {
    return <p className="text-sm text-destructive">{error ?? 'Could not load roster.'}</p>
  }

  if (!hasTemplate(displayTree)) {
    return (
      <div className="space-y-5">
        <DashboardPageHeader
          breadcrumbs={[
            { label: 'Dashboard', to: '/' },
            { label: 'Roster' },
            { label: 'Units' },
          ]}
          title="Roster"
          description="Add org units (PFCC, fellowship, cell, etc.) under your saved structure — not people."
        />
        <RosterEmptyState />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        breadcrumbs={[
          { label: 'Dashboard', to: '/' },
          { label: 'Roster' },
          { label: 'Units' },
        ]}
        title="Roster"
        description={
          readOnly
            ? `${me.scopeUnitName ?? 'Your unit'} — view units in your scope.`
            : `${displayTree.template!.name} — ${getLayers(displayTree).map((l) => l.displayName).join(', ')}. Click a unit to manage its members.`
        }
      />
      <RosterView
        tree={displayTree}
        error={error}
        busy={busy}
        submit={submit}
        readOnly={readOnly}
        canManageChurch={canManageChurch(me.role)}
        scopeRootNodeId={rosterScopeRootNodeId(me)}
        actorScopeNodeId={rosterScopeRootNodeId(me)}
        createActor={rosterCreateActor(me)}
      />
    </div>
  )
}
