import { useEffect, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { useOutletContext, useParams } from 'react-router-dom'
import type { DashboardOutletContext } from '@/components/layout/dashboard-layout'
import { DashboardPageHeader } from '@/components/layout/dashboard-page-header'
import {
  DashboardSetupPreview,
  PastorDashboardHome,
} from '@/components/overview/dashboard-home'
import { LeaderOverviewDashboard } from '@/components/overview/leader-overview-dashboard'
import { StructureSetupCallout } from '@/components/overview/structure-setup-callout'
import { dashboardWelcomeSubtitle } from '@/lib/dashboard-setup-actions'
import { useGetGivingDashboardQuery } from '@/store/givingApi'
import { formatRtkQueryError } from '@/store/baseQuery'
import {
  canManageChurch,
  displayName,
  isCellLeader,
  isScopedLeader,
  canManageMembers,
  rollCallScopesFor,
  rosterScopeRootNodeId,
} from '@/api/auth'
import { canAccessEvents } from '@/lib/calendar-events-ui'
import { useAuth } from '@/auth/AuthContext'
import { filterTreeToSubtree } from '@/lib/structure-tree'
import { MembershipEmptyState, MembershipView } from '@/components/structure/membership-view'
import {
  membershipPageDescription,
  resolveMemberWizardMode,
} from '@/components/structure/member-wizard-steps'
import { RosterEmptyState, RosterView } from '@/components/structure/roster-view'
import { RosterUnitView } from '@/components/structure/roster-unit-view'
import { StructureActionsMenu } from '@/components/structure/structure-actions-menu'
import { StructureCanvas } from '@/components/structure/structure-canvas'
import { StructureLayerEditModal } from '@/components/structure/structure-layer-edit-modal'
import {
  StructureLayerRemoveModal,
  StructureResetModal,
} from '@/components/structure/structure-reset-modal'
import {
  StructureEvolveWizard,
  type StructureEvolveMode,
} from '@/components/structure/structure-evolve-wizard'
import { StructureTemplateWizard } from '@/components/structure/structure-template-wizard'
import { useStructureTree } from '@/components/structure/structure-setup'
import { hasTemplate } from '@/lib/structure-dashboard'
import {
  canRemoveStructureLayer,
  structureLayerRemoveIntent,
} from '@/lib/can-remove-structure-layer'
import { getLayers } from '@/lib/structure-tree'
import { hasDesignedStructure } from '@/lib/structure-table-rows'
import type { StructureLayerInput } from '@/api/structure'
import { useApi } from '@/api/core'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { Link } from 'react-router-dom'
import { Gift } from 'lucide-react'

function LeaderOverviewFallback() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Gift className="size-4 text-primary" />
          Your givings
        </CardTitle>
        <CardDescription>
          Open Givings to view campaigns, log contributions, and track approvals in your scope.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild>
          <Link to="/givings">Go to Givings</Link>
        </Button>
      </CardContent>
    </Card>
  )
}

function scopedRosterTree(
  tree: ReturnType<typeof useStructureTree>['tree'],
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

export function DashboardPage() {
  const { me } = useOutletContext<DashboardOutletContext>()
  const { email } = useAuth()
  const { tree } = useStructureTree()
  const showDashboard = hasTemplate(tree)
  const churchManager = canManageChurch(me.role)
  const scopedLeader = isScopedLeader(me.role)
  const cellLeader = isCellLeader(me.role)
  const leaderDashboardRole = scopedLeader || cellLeader
  const {
    data: leaderDashboard,
    isLoading: dashboardLoading,
    error: dashboardQueryError,
  } = useGetGivingDashboardQuery(undefined, { skip: !leaderDashboardRole })
  const dashboardError = dashboardQueryError ? formatRtkQueryError(dashboardQueryError) : null

  const scopedTree = useMemo(() => {
    if (!tree) return tree
    if (cellLeader) {
      const cellScopeId =
        rollCallScopesFor(me)[0]?.scopeNodeId ?? me.scopeNodeId ?? null
      return cellScopeId ? filterTreeToSubtree(tree, cellScopeId) : tree
    }
    if (scopedLeader && me.scopeNodeId) {
      return filterTreeToSubtree(tree, me.scopeNodeId)
    }
    return tree
  }, [tree, cellLeader, scopedLeader, me])

  const scopeTitle =
    leaderDashboard?.scopeUnitName ??
    rollCallScopesFor(me)[0]?.scopeUnitName ??
    me.scopeUnitName ??
    me.churchName ??
    'Your church'

  const firstName = displayName(me, email).split(' ')[0] || 'Pastor'

  const pastorSubtitle =
    showDashboard && tree
      ? dashboardWelcomeSubtitle(tree)
      : 'Define your structure chain, populate Roster, then register members in Membership.'

  const showPageHeader =
    leaderDashboardRole || (churchManager && !showDashboard)

  return (
    <div className="space-y-6 sm:space-y-8">
      {showPageHeader ? (
        <DashboardPageHeader
          breadcrumbs={[{ label: 'Dashboard' }]}
          title={leaderDashboardRole ? scopeTitle : 'Dashboard'}
          description={
            cellLeader
              ? 'Your cell — members, givings, and attendance.'
              : scopedLeader
                ? me.role === 'FellowshipLeader'
                  ? 'Cells, members, and giving in your fellowship.'
                  : 'Metrics and giving for your PFCC scope.'
                : pastorSubtitle
          }
        />
      ) : null}

      {churchManager && !showDashboard ? (
        <StructureSetupCallout tree={tree} churchName={me.churchName} />
      ) : null}

      {leaderDashboardRole && showDashboard && scopedTree ? (
        dashboardLoading ? (
          <Spinner label="Loading your dashboard…" />
        ) : dashboardError ? (
          <p className="text-sm text-destructive">{dashboardError}</p>
        ) : leaderDashboard ? (
          <LeaderOverviewDashboard
            tree={scopedTree}
            dashboard={leaderDashboard}
            role={me.role}
          />
        ) : null
      ) : churchManager && showDashboard && scopedTree ? (
        <PastorDashboardHome
          tree={scopedTree}
          firstName={firstName}
          showEvents={canAccessEvents(me)}
        />
      ) : churchManager ? (
        <DashboardSetupPreview tree={tree} />
      ) : (
        <LeaderOverviewFallback />
      )}
    </div>
  )
}

export function StructurePage() {
  const api = useApi()
  const { me } = useOutletContext<DashboardOutletContext>()
  const { tree, error, busy, loading, submit, load } = useStructureTree()
  const [layerEditOpen, setLayerEditOpen] = useState(false)
  const [editLayerIndex, setEditLayerIndex] = useState<number | null>(null)
  const [evolveMode, setEvolveMode] = useState<StructureEvolveMode | null>(null)
  const [evolveInsertAt, setEvolveInsertAt] = useState(0)
  const [removeLayerIndex, setRemoveLayerIndex] = useState<number | null>(null)
  const [resetOpen, setResetOpen] = useState(false)
  const churchManager = canManageChurch(me.role)

  useEffect(() => {
    void load()
  }, [load])

  if (loading && !tree) {
    return <Spinner label="Loading structure…" />
  }

  if (!tree) {
    return (
      <p className="text-sm text-destructive">{error ?? 'Could not load structure.'}</p>
    )
  }

  const templated = hasTemplate(tree)
  const hasRoster = hasDesignedStructure(tree)
  const layers = getLayers(tree)

  function layerInputs(): StructureLayerInput[] {
    return layers.map((l) => ({
      standardType: l.standardType,
      displayName: l.displayName,
    }))
  }

  function resolveInsertEvolveMode(insertAt: number): StructureEvolveMode {
    if (insertAt === 0) return 'appendTop'
    if (insertAt >= layers.length) return 'appendBeforeMember'
    return 'insertAt'
  }

  function handleInsertAt(insertAt: number) {
    if (!churchManager) return
    if (hasRoster) {
      setEvolveInsertAt(insertAt)
      setEvolveMode(resolveInsertEvolveMode(insertAt))
      return
    }
    void submit(async () => {
      const template = tree!.template!
      const next = layerInputs()
      next.splice(insertAt, 0, { standardType: 'Fellowship', displayName: 'New layer' })
      await api.put('/api/structure/template', {
        name: template.name,
        layers: next,
      })
    })
  }

  function handleEditLayer(layerIndex: number | null) {
    if (!churchManager) return
    setEditLayerIndex(layerIndex)
    setLayerEditOpen(true)
  }

  function handleRemoveAt(layerIndex: number) {
    if (!churchManager) return
    if (!canRemoveStructureLayer(layers, layerIndex)) return
    setRemoveLayerIndex(layerIndex)
  }

  async function handleConfirmRemoveLayer() {
    if (removeLayerIndex === null || !tree?.template) return
    const next = layerInputs().filter((_, index) => index !== removeLayerIndex)
    await submit(async () => {
      await api.put('/api/structure/template', {
        name: tree.template!.name,
        layers: next,
      })
    })
    setRemoveLayerIndex(null)
  }

  async function handleConfirmReset() {
    await submit(async () => {
      await api.delete('/api/structure/template')
    })
    setResetOpen(false)
    setRemoveLayerIndex(null)
  }

  async function handleSaveLayerEdit(payload: {
    structureName: string
    layer: StructureLayerInput | null
  }) {
    await submit(async () => {
      if (hasRoster) {
        const nextLayers = layerInputs().map((layer, index) =>
          editLayerIndex === index && payload.layer ? payload.layer : layer,
        )
        await api.post('/api/structure/template/evolve', {
          operation: 'rename',
          name: payload.structureName,
          layers: nextLayers,
          dryRun: false,
        })
        return
      }

      const nextLayers = layerInputs().map((layer, index) =>
        editLayerIndex === index && payload.layer ? payload.layer : layer,
      )
      await api.put('/api/structure/template', {
        name: payload.structureName,
        layers: nextLayers,
      })
    })
  }

  if (!templated) {
    return (
      <div className="space-y-5">
        <DashboardPageHeader
          breadcrumbs={[
            { label: 'Dashboard', to: '/' },
            { label: 'Structure' },
          ]}
          title="Structure"
          description="Define how your church is organized — layer names only. Add actual PFCCs, cells, and members in Roster."
        />
        <StructureTemplateWizard
          churchName={tree.churchName}
          submitLabel="Save structure definition"
          busy={busy}
          submit={submit}
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <DashboardPageHeader
        breadcrumbs={[
          { label: 'Dashboard', to: '/' },
          { label: 'Structure' },
        ]}
        title="Structure"
        description={`How ${tree.churchName} is organized — layer names only, not individual units.`}
        actions={
          churchManager ? (
            <StructureActionsMenu
              hasRoster={hasRoster}
              busy={busy}
              onRename={() => setEvolveMode('rename')}
              onDelete={() => setResetOpen(true)}
            />
          ) : undefined
        }
      />

      <StructureCanvas
        tree={tree}
        editable={churchManager}
        busy={busy}
        onInsertAt={handleInsertAt}
        onRemoveAt={handleRemoveAt}
        onEditLayer={handleEditLayer}
      />

      <StructureLayerRemoveModal
        layerName={
          removeLayerIndex !== null ? layers[removeLayerIndex]?.displayName ?? null : null
        }
        intent={
          removeLayerIndex === null ? null : structureLayerRemoveIntent(hasRoster)
        }
        busy={busy}
        onConfirmRemove={() => {
          void handleConfirmRemoveLayer()
        }}
        onOfferReset={() => {
          setRemoveLayerIndex(null)
          setResetOpen(true)
        }}
        onClose={() => setRemoveLayerIndex(null)}
      />

      <StructureResetModal
        open={resetOpen}
        busy={busy}
        onConfirm={() => {
          void handleConfirmReset()
        }}
        onClose={() => setResetOpen(false)}
      />

      <StructureLayerEditModal
        open={layerEditOpen}
        onClose={() => {
          setLayerEditOpen(false)
          setEditLayerIndex(null)
        }}
        structureName={tree.template?.name ?? 'Main structure'}
        layer={
          editLayerIndex !== null
            ? {
                standardType: layers[editLayerIndex]!.standardType,
                displayName: layers[editLayerIndex]!.displayName,
              }
            : null
        }
        layerIndex={editLayerIndex}
        isCellLayer={editLayerIndex === layers.length - 1}
        busy={busy}
        onSave={handleSaveLayerEdit}
      />

      {evolveMode && (
        <StructureEvolveWizard
          tree={tree}
          mode={evolveMode}
          busy={busy}
          submit={submit}
          initialInsertAt={evolveInsertAt}
          onClose={() => {
            setEvolveMode(null)
            setEvolveInsertAt(0)
          }}
        />
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}

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
      />
    </div>
  )
}

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
    />
  )
}

export function MembershipPage() {
  const { me } = useOutletContext<DashboardOutletContext>()
  const { tree, error, busy, loading, load, submit } = useStructureTree()
  const [addOpen, setAddOpen] = useState(false)
  const canManage = canManageMembers(me)
  const cellScope = isCellLeader(me.role)
    ? rollCallScopesFor(me)[0]?.scopeNodeId ?? me.scopeNodeId
    : me.scopeNodeId
  const scopeParentNodeId = canManageChurch(me.role) ? null : cellScope
  const displayTree = useMemo(() => scopedRosterTree(tree, me), [tree, me])

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
          canManage && hasRosterUnits ? (
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
          scopeParentNodeId={scopeParentNodeId}
        />
      )}
    </div>
  )
}

export function ComingSoonPage({ feature }: { feature: string }) {
  return (
    <div className="space-y-6">
      <DashboardPageHeader
        breadcrumbs={[
          { label: 'Dashboard', to: '/' },
          { label: feature },
        ]}
        title={feature}
        description="This section is coming in the next implementation phase."
      />
      <Card>
        <CardHeader>
          <CardTitle>{feature}</CardTitle>
          <CardDescription>This section is coming in the next implementation phase.</CardDescription>
        </CardHeader>
      </Card>
    </div>
  )
}
