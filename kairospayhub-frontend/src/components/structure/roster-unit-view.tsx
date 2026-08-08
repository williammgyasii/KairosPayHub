import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Plus } from 'lucide-react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useApi } from '@/api/useApi'
import type { StructureTree } from '@/api/structure'
import { DashboardPageHeader } from '@/components/layout/dashboard-page-header'
import { MemberFormSheet, type MemberSheetState } from '@/components/structure/member-form-sheet'
import { StructureMemberTable } from '@/components/structure/structure-member-table'
import { StructurePageTabs } from '@/components/structure/structure-page-tabs'
import { StructureUnitNodeTable } from '@/components/structure/structure-unit-node-table'
import {
  UnitNodeFormSheet,
  type UnitNodeSheetState,
} from '@/components/structure/unit-node-form-sheet'
import { FellowshipCreateWizard } from '@/components/structure/fellowship-create-wizard'
import { CellCreateWizard } from '@/components/structure/cell-create-wizard'
import { UnitDeleteModal } from '@/components/structure/unit-delete-modal'
import { Button } from '@/components/ui/button'
import {
  buildMemberRows,
  buildUnitNodeRows,
  type StructureUnitNodeRow,
} from '@/lib/structure-table-rows'
import {
  countCellsUnderUnit,
  countMembersUnderUnit,
  getDeepestLayer,
  getLayers,
  layerById,
  memberBelongsToUnit,
  nodeById,
  rosterBreadcrumbChain,
  unitDetailTabs,
  unitDeleteImpact,
} from '@/lib/structure-tree'

interface RosterUnitViewProps {
  tree: StructureTree
  unitNodeId: string
  error: string | null
  busy: boolean
  submit: (action: () => Promise<void>) => Promise<void>
  readOnly?: boolean
  scopeRootNodeId?: string | null
}

export function RosterUnitView({
  tree,
  unitNodeId,
  error,
  busy,
  submit,
  readOnly = false,
  scopeRootNodeId = null,
}: RosterUnitViewProps) {
  const api = useApi()
  const navigate = useNavigate()
  const unit = nodeById(tree, unitNodeId)
  const layer = unit ? layerById(tree, unit.layerId) : undefined
  const tabs = useMemo(() => unitDetailTabs(tree, unitNodeId), [tree, unitNodeId])
  const pageTabs = useMemo(
    () =>
      tabs.map((tab) => ({
        id: tab.id,
        label: tab.kind === 'layer' ? tab.layer.displayName : tab.label,
        count: tab.count,
      })),
    [tabs],
  )
  const [activeTabId, setActiveTabId] = useState(tabs[0]?.id ?? 'members')
  const [memberSheet, setMemberSheet] = useState<MemberSheetState | null>(null)
  const [nodeSheet, setNodeSheet] = useState<UnitNodeSheetState | null>(null)
  const [fellowshipWizardOpen, setFellowshipWizardOpen] = useState(false)
  const [cellWizardOpen, setCellWizardOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<StructureUnitNodeRow | null>(null)

  const memberRows = useMemo(() => {
    if (!unit) return []
    return buildMemberRows(tree).filter((row) =>
      memberBelongsToUnit(tree, unit.id, row.parentNodeId),
    )
  }, [tree, unit])

  useEffect(() => {
    setActiveTabId(tabs[0]?.id ?? 'members')
  }, [unitNodeId, tabs])

  if (!unit || !layer) {
    return <Navigate to="/roster" replace />
  }

  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0]
  const breadcrumbs = [
    { label: 'Overview', to: '/' },
    { label: 'Roster', to: '/roster' },
    { label: 'Units', to: '/roster' },
    ...rosterBreadcrumbChain(tree, unit.id, scopeRootNodeId).map((node) => ({
      label: node.name,
      to: `/roster/units/${node.id}`,
    })),
  ]
  const deepest = getDeepestLayer(tree)
  const isDeepest = deepest?.id === layer.id
  const memberCount = countMembersUnderUnit(tree, unit.id)
  const cellCount = countCellsUnderUnit(tree, unit.id)

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.state?.idx > 0) {
      navigate(-1)
      return
    }
    if (unit.parentNodeId) {
      navigate(`/roster/units/${unit.parentNodeId}`)
      return
    }
    navigate('/roster')
  }

  const summary = isDeepest
    ? `${memberCount} member${memberCount === 1 ? '' : 's'}`
    : `${cellCount} ${deepest?.displayName.toLowerCase() ?? 'cell'}${cellCount === 1 ? '' : 's'} · ${memberCount} member${memberCount === 1 ? '' : 's'}`

  const openCreateNode = () => {
    if (activeTab?.kind !== 'layer') return
    if (activeTab.layer.standardType === 'Fellowship') {
      setFellowshipWizardOpen(true)
      return
    }
    if (deepest && activeTab.layer.id === deepest.id) {
      setCellWizardOpen(true)
      return
    }
    setNodeSheet({ mode: 'create', layer: activeTab.layer, parentNodeId: unit.id })
  }

  const deleteImpact = useMemo(
    () => (deleteTarget ? unitDeleteImpact(tree, deleteTarget.id) : null),
    [deleteTarget, tree],
  )

  const handleDeleteNode = (row: StructureUnitNodeRow) => {
    setDeleteTarget(row)
  }

  const confirmDeleteNode = () => {
    if (!deleteTarget) return
    void submit(async () => {
      await api.delete(`/api/structure/nodes/${deleteTarget.id}`)
      setDeleteTarget(null)
    })
  }

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        breadcrumbs={breadcrumbs}
        title={unit.name}
        description={summary}
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-9 shrink-0"
              onClick={handleBack}
              aria-label="Go back"
            >
              <ArrowLeft className="size-4" />
            </Button>

            {activeTab?.kind === 'layer' && !readOnly && (
              <Button className="shrink-0" onClick={openCreateNode}>
                <Plus className="size-4" />
                Add new {activeTab.layer.displayName.toLowerCase()}
              </Button>
            )}

            {activeTab?.kind === 'members' && !readOnly && (
              <Button className="shrink-0" onClick={() => setMemberSheet({ mode: 'create' })}>
                <Plus className="size-4" />
                Add member
              </Button>
            )}
          </>
        }
      />

      <StructurePageTabs tabs={pageTabs} activeId={activeTabId} onChange={setActiveTabId} />

      {error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {activeTab?.kind === 'layer' && (
        <StructureUnitNodeTable
          rows={buildUnitNodeRows(tree, unit.id, activeTab.layer.id)}
          layer={activeTab.layer}
          childLayer={getLayers(tree).find((l) => l.sortOrder === activeTab.layer.sortOrder + 1)}
          hidePathColumn={activeTab.layer.sortOrder === layer.sortOrder + 1}
          hideParentColumn={activeTab.layer.sortOrder === layer.sortOrder + 1}
          embedded
          readOnly={readOnly}
          onEdit={(row) =>
            setNodeSheet({ mode: 'edit', row, layer: activeTab.layer })
          }
          onDelete={handleDeleteNode}
        />
      )}

      {activeTab?.kind === 'members' && (
        <StructureMemberTable
          rows={memberRows}
          structureLayers={getLayers(tree)}
          emptyMessage={`No members under ${unit.name} yet.${readOnly ? '' : ' Add cells first if needed, then click Add member.'}`}
          onEdit={(member) => setMemberSheet({ mode: 'edit', member })}
          embedded
          readOnly={readOnly}
        />
      )}

      {!readOnly && memberSheet && (
        <MemberFormSheet
          tree={tree}
          unitNodeId={unit.id}
          busy={busy}
          submit={submit}
          sheet={memberSheet}
          onClose={() => setMemberSheet(null)}
        />
      )}

      {!readOnly && fellowshipWizardOpen && activeTab?.kind === 'layer' && (
        <FellowshipCreateWizard
          tree={tree}
          unitNodeId={unit.id}
          layer={activeTab.layer}
          parentNodeId={unit.id}
          busy={busy}
          submit={submit}
          onClose={() => setFellowshipWizardOpen(false)}
        />
      )}

      {!readOnly && cellWizardOpen && activeTab?.kind === 'layer' && deepest && (
        <CellCreateWizard
          tree={tree}
          unitNodeId={unit.id}
          layer={activeTab.layer}
          parentNodeId={unit.id}
          busy={busy}
          submit={submit}
          onClose={() => setCellWizardOpen(false)}
        />
      )}

      {!readOnly && nodeSheet && (
        <UnitNodeFormSheet
          tree={tree}
          unitNodeId={unit.id}
          busy={busy}
          submit={submit}
          sheet={nodeSheet}
          onClose={() => setNodeSheet(null)}
        />
      )}

      {!readOnly && deleteTarget && (
        <UnitDeleteModal
          impact={deleteImpact}
          busy={busy}
          onConfirm={confirmDeleteNode}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
