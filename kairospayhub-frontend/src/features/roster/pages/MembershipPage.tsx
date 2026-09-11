import { useEffect, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { useOutletContext } from 'react-router-dom'
import {
  canManageChurch,
  canManageMembers,
  isCellLeader,
  rollCallScopesFor,
} from '@/api/auth'
import { useStructureTree } from '@/shared/lib/use-structure-tree'
import { scopedRosterTree } from '@/features/roster/lib/scoped-roster-tree'
import { GenerateJoinLinkDialog } from '@/features/roster/components/generate-join-link-dialog'
import { MembershipJoinHeaderActions } from '@/features/roster/components/membership-join-header-actions'
import { membershipPageDescription, resolveMemberWizardMode } from '@/features/roster/components/member-wizard-steps'
import { MembershipEmptyState, MembershipView } from '@/features/roster/components/membership-view'
import { membershipPrimaryAction, type MembershipRosterTab } from '@/lib/join-link-policy'
import { hasTemplate } from '@/lib/structure-dashboard'
import type { DashboardOutletContext } from '@/shared/layout/dashboard-layout'
import { DashboardPageHeader } from '@/shared/layout/dashboard-page-header'
import { Button } from '@/shared/ui/button'
import { Spinner } from '@/shared/ui/spinner'

export function MembershipPage() {
  const { me } = useOutletContext<DashboardOutletContext>()
  const { tree, error, busy, loading, load, submit } = useStructureTree()
  const [addOpen, setAddOpen] = useState(false)
  const [joinOpen, setJoinOpen] = useState(false)
  const [rosterTab, setRosterTab] = useState<MembershipRosterTab>('all')
  const [pendingCount, setPendingCount] = useState(0)
  const canManage = canManageMembers(me)
  const cellScope = isCellLeader(me.role)
    ? rollCallScopesFor(me)[0]?.scopeNodeId ?? me.scopeNodeId
    : me.scopeNodeId
  const scopeParentNodeId = canManageChurch(me.role) ? null : cellScope
  const displayTree = useMemo(() => scopedRosterTree(tree, me), [tree, me])
  const primaryAction = displayTree
    ? membershipPrimaryAction({
        tree: displayTree,
        canManageRoster: canManage,
        canManageChurch: canManageChurch(me.role),
        actorScopeNodeId: scopeParentNodeId,
      })
    : null

  useEffect(() => {
    void load({ includeMembers: false })
  }, [load])

  if (loading && !tree) {
    return <Spinner label="Loading membership…" />
  }

  if (!displayTree) {
    return <p className="text-sm text-destructive">{error ?? 'Could not load membership.'}</p>
  }

  if (!hasTemplate(displayTree)) {
    return (
      <div className="space-y-5">
        <DashboardPageHeader
          breadcrumbs={[
            { label: 'Dashboard', to: '/' },
            { label: 'Roster', to: '/roster' },
            { label: 'Membership' },
          ]}
          title="Membership"
          titleSize="hero"
          description="Register people and assign them to roster units under your church structure."
        />
        <MembershipEmptyState needsRoster={false} />
      </div>
    )
  }

  const hasRosterUnits = displayTree.nodes.length > 0
  const scopeLabel =
    rollCallScopesFor(me)[0]?.scopeUnitName ?? me.scopeUnitName ?? 'your unit'
  const membershipMode = resolveMemberWizardMode(displayTree, scopeParentNodeId)

  return (
    <div className="space-y-5">
      <DashboardPageHeader
        breadcrumbs={[
          { label: 'Dashboard', to: '/' },
          { label: 'Roster', to: '/roster' },
          { label: 'Membership' },
        ]}
        title="Membership"
        titleSize="hero"
        description={membershipPageDescription(membershipMode, scopeLabel, canManage)}
        actions={
          primaryAction === 'generate-join-link' && hasRosterUnits && scopeParentNodeId ? (
            <MembershipJoinHeaderActions
              tab={rosterTab}
              onTabChange={setRosterTab}
              pendingCount={pendingCount}
              onGenerateJoinLink={() => setJoinOpen(true)}
            />
          ) : primaryAction === 'add-member' && hasRosterUnits ? (
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="size-4" />
              Add member
            </Button>
          ) : undefined
        }
      />

      {!hasRosterUnits ? (
        <MembershipEmptyState needsRoster pastorOnlyStructure={!canManage} />
      ) : (
        <MembershipView
          tree={displayTree}
          error={error}
          busy={busy}
          submit={submit}
          wizardOpen={addOpen}
          onWizardOpenChange={setAddOpen}
          readOnly={!canManage}
          hideAddMemberHint={primaryAction === 'generate-join-link'}
          scopeParentNodeId={scopeParentNodeId}
          currentMemberId={me.onboarded ? me.memberId : null}
          rosterTab={primaryAction === 'generate-join-link' ? rosterTab : 'all'}
          onPendingCountChange={setPendingCount}
        />
      )}

      {scopeParentNodeId && (
        <GenerateJoinLinkDialog
          open={joinOpen}
          onOpenChange={setJoinOpen}
          nodeId={scopeParentNodeId}
        />
      )}
    </div>
  )
}
