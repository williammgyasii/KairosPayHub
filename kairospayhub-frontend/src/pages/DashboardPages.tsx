import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { useOutletContext, useParams } from 'react-router-dom'
import type { DashboardOutletContext } from '@/components/layout/dashboard-layout'
import { DashboardPageHeader } from '@/components/layout/dashboard-page-header'
import {
  OverviewDashboard,
  OverviewSetupPreview,
} from '@/components/overview/overview-dashboard'
import { StructureSetupCallout } from '@/components/overview/structure-setup-callout'
import { MembershipEmptyState, MembershipView } from '@/components/structure/membership-view'
import { RosterEmptyState, RosterView } from '@/components/structure/roster-view'
import { RosterUnitView } from '@/components/structure/roster-unit-view'
import { StructureDefinitionCard } from '@/components/structure/structure-definition-card'
import {
  StructureEvolveWizard,
  type StructureEvolveMode,
} from '@/components/structure/structure-evolve-wizard'
import { StructureTemplateWizard } from '@/components/structure/structure-template-wizard'
import { useStructureTree } from '@/components/structure/structure-setup'
import { hasTemplate } from '@/lib/structure-dashboard'
import { getLayers } from '@/lib/structure-tree'
import { StructureChainFromLabels } from '@/components/structure/structure-chain'
import { hasDesignedStructure } from '@/lib/structure-table-rows'
import { useApi } from '@/api/useApi'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'

export function OverviewPage() {
  const { me } = useOutletContext<DashboardOutletContext>()
  const { tree } = useStructureTree()
  const showDashboard = hasTemplate(tree)

  return (
    <div className="space-y-8">
      <DashboardPageHeader
        breadcrumbs={[{ label: 'Overview' }]}
        title={me.churchName ?? 'Your church'}
        description={
          showDashboard
            ? tree?.nodes.length || tree?.members.length
              ? 'Live metrics, charts, and recommendations from your church structure.'
              : `${tree?.template?.name ?? 'Your structure'} is saved. Add org units in Roster and people in Membership.`
            : 'Define your structure chain, populate Roster, then register members in Membership.'
        }
      />

      <StructureSetupCallout tree={tree} churchName={me.churchName} />

      {showDashboard && tree ? (
        <OverviewDashboard tree={tree} churchName={me.churchName} />
      ) : (
        <OverviewSetupPreview tree={tree} />
      )}
    </div>
  )
}

export function StructurePage() {
  const api = useApi()
  const { tree, error, busy, loading, submit, load } = useStructureTree()
  const [editing, setEditing] = useState(false)
  const [evolveMode, setEvolveMode] = useState<StructureEvolveMode | null>(null)
  const [pickAddLayer, setPickAddLayer] = useState(false)

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

  if (!templated || (editing && !hasRoster)) {
    return (
      <div className="space-y-5">
        <DashboardPageHeader
          breadcrumbs={[
            { label: 'Overview', to: '/' },
            { label: 'Structure' },
          ]}
          title="Structure"
          description="Define how your church is organized — layer names only. Add actual PFCCs, cells, and members in Roster."
        />
        <StructureTemplateWizard
          churchName={tree.churchName}
          initialName={tree.template?.name}
          initialLayers={
            tree.template
              ? getLayers(tree).map((l) => ({
                  standardType: l.standardType,
                  displayName: l.displayName,
                }))
              : undefined
          }
          submitLabel={templated ? 'Save changes' : 'Save structure definition'}
          onCancel={templated ? () => setEditing(false) : undefined}
          busy={busy}
          submit={async (action) => {
            await submit(action)
            setEditing(false)
          }}
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <DashboardPageHeader
        breadcrumbs={[
          { label: 'Overview', to: '/' },
          { label: 'Structure' },
        ]}
        title="Structure"
        description={`Your org layer chain for ${tree.churchName}. Populate instances in Roster.`}
      />

      <StructureDefinitionCard
        tree={tree}
        busy={busy}
        onEdit={() => setEditing(true)}
        onRename={() => setEvolveMode('rename')}
        onAddLayer={() => setPickAddLayer(true)}
        onDelete={() => {
          if (
            !window.confirm(
              'Delete this structure definition? You can create a new one afterward. Roster must be empty.',
            )
          ) {
            return
          }
          void submit(async () => {
            await api.delete('/api/structure/template')
          })
        }}
      />

      {evolveMode && (
        <StructureEvolveWizard
          tree={tree}
          mode={evolveMode}
          busy={busy}
          submit={submit}
          onClose={() => setEvolveMode(null)}
        />
      )}

      {pickAddLayer && (
        <ModalPickAddLayer
          layers={getLayers(tree)}
          onClose={() => setPickAddLayer(false)}
          onAppendTop={() => {
            setPickAddLayer(false)
            setEvolveMode('appendTop')
          }}
          onInsert={() => {
            setPickAddLayer(false)
            setEvolveMode('insertAt')
          }}
          onBeforeMembers={() => {
            setPickAddLayer(false)
            setEvolveMode('appendBeforeMember')
          }}
        />
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}

function ModalPickAddLayer({
  layers,
  onClose,
  onAppendTop,
  onInsert,
  onBeforeMembers,
}: {
  layers: ReturnType<typeof getLayers>
  onClose: () => void
  onAppendTop: () => void
  onInsert: () => void
  onBeforeMembers: () => void
}) {
  const deepest = layers[layers.length - 1]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px] animate-in fade-in duration-300">
      <div className="w-full max-w-md space-y-4 rounded-xl border border-border/60 bg-background p-6 shadow-lg animate-fade-up">
        <div>
          <h2 className="text-base font-semibold">Add org layer</h2>
          <p className="mt-1 text-sm text-muted-foreground">Choose where the new layer belongs.</p>
          <StructureChainFromLabels labels={layers.map((l) => l.displayName)} includeChurch includeMember className="mt-3" />
        </div>
        <div className="space-y-2">
          <Button className="w-full justify-start" variant="outline" onClick={onAppendTop}>
            <Plus className="size-4" />
            Add on top (before {layers[0]?.displayName ?? 'first layer'})
          </Button>
          <Button
            className="w-full justify-start"
            variant="outline"
            onClick={onInsert}
            disabled={layers.length < 2}
          >
            <Plus className="size-4" />
            Insert between org layers
          </Button>
          <Button className="w-full justify-start" variant="outline" onClick={onBeforeMembers}>
            <Plus className="size-4" />
            Before members (after {deepest?.displayName ?? 'deepest layer'})
          </Button>
        </div>
        <div className="flex justify-end">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}

export function RosterPage() {
  const { tree, error, busy, loading, load, submit } = useStructureTree()

  useEffect(() => {
    void load()
  }, [load])

  if (loading && !tree) {
    return <Spinner label="Loading roster…" />
  }

  if (!tree) {
    return <p className="text-sm text-destructive">{error ?? 'Could not load roster.'}</p>
  }

  if (!hasTemplate(tree)) {
    return (
      <div className="space-y-5">
        <DashboardPageHeader
          breadcrumbs={[
            { label: 'Overview', to: '/' },
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
          { label: 'Overview', to: '/' },
          { label: 'Roster' },
          { label: 'Units' },
        ]}
        title="Roster"
        description={`${tree.template!.name} — ${getLayers(tree).map((l) => l.displayName).join(', ')}. Click a unit to manage its members.`}
      />
      <RosterView tree={tree} error={error} busy={busy} submit={submit} />
    </div>
  )
}

export function RosterUnitPage() {
  const { nodeId } = useParams<{ nodeId: string }>()
  const { tree, error, busy, loading, load, submit } = useStructureTree()

  useEffect(() => {
    void load()
  }, [load])

  if (loading && !tree) {
    return <Spinner label="Loading unit…" />
  }

  if (!tree) {
    return <p className="text-sm text-destructive">{error ?? 'Could not load unit.'}</p>
  }

  if (!hasTemplate(tree) || !nodeId) {
    return <RosterEmptyState />
  }

  return (
    <RosterUnitView
      tree={tree}
      unitNodeId={nodeId}
      error={error}
      busy={busy}
      submit={submit}
    />
  )
}

export function MembershipPage() {
  const { tree, error, busy, loading, load, submit } = useStructureTree()
  const [addOpen, setAddOpen] = useState(false)

  useEffect(() => {
    void load()
  }, [load])

  if (loading && !tree) {
    return <Spinner label="Loading membership…" />
  }

  if (!tree) {
    return <p className="text-sm text-destructive">{error ?? 'Could not load membership.'}</p>
  }

  if (!hasTemplate(tree)) {
    return (
      <div className="space-y-5">
        <DashboardPageHeader
          breadcrumbs={[
            { label: 'Overview', to: '/' },
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

  const hasRosterUnits = tree.nodes.length > 0

  return (
    <div className="space-y-5">
      <DashboardPageHeader
        breadcrumbs={[
          { label: 'Overview', to: '/' },
          { label: 'Roster', to: '/roster' },
          { label: 'Membership' },
        ]}
        title="Membership"
        titleSize="hero"
        description={`Register members with name, phone, age, and role — placed under a roster unit from ${tree.template!.name}.`}
        actions={
          hasRosterUnits ? (
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="size-4" />
              Add member
            </Button>
          ) : undefined
        }
      />

      {!hasRosterUnits ? (
        <MembershipEmptyState needsRoster />
      ) : (
        <MembershipView
          tree={tree}
          error={error}
          busy={busy}
          submit={submit}
          wizardOpen={addOpen}
          onWizardOpenChange={setAddOpen}
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
          { label: 'Overview', to: '/' },
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
