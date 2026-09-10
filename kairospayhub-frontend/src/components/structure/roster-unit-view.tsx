import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Plus } from 'lucide-react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useApi } from '@/api/core'
import type { StructureTree } from '@/api/structure'
import { DashboardPageHeader } from '@/components/layout/dashboard-page-header'
import { MemberDeleteModal } from '@/components/structure/member-delete-modal'
import { MemberFormSheet, type MemberSheetState } from '@/components/structure/member-form-sheet'
import { MemberTableToolbar } from '@/components/structure/member-table-toolbar'
import {
  StructureMemberTable,
  type MemberViewDestination,
} from '@/components/structure/structure-member-table'
import { StructurePageTabs } from '@/components/structure/structure-page-tabs'
import { StructureUnitNodeTable } from '@/components/structure/structure-unit-node-table'
import {
  UnitNodeFormSheet,
  type UnitNodeSheetState,
} from '@/components/structure/unit-node-form-sheet'
import {
  ChangeLeadershipModal,
  type ChangeLeadershipTarget,
} from '@/components/structure/change-leadership-modal'
import { UnitCreateWizard } from '@/components/structure/unit-create-wizard'
import { UnitDeleteModal } from '@/components/structure/unit-delete-modal'
import { AddFellowshipButton } from '@/components/structure/add-fellowship-button'
import { Button } from '@/components/ui/button'
import {
  applyMemberFilterRules,
  applyMemberSearch,
  leadersMemberFilterPreset,
  type MemberFilterField,
  type MemberFilterRule,
} from '@/lib/member-filters'
import {
  buildMemberRows,
  buildUnitNodeRows,
  type StructureMemberRow,
  type StructureUnitNodeRow,
} from '@/lib/structure-table-rows'
import { createUnitPolicy } from '@/lib/create-unit-policy'
import {
  countCellsUnderUnit,
  countMembersUnderUnit,
  formatFellowshipName,
  formatCellName,
  getDeepestLayer,
  getLayers,
  isUnitChildLayerUnlocked,
  layerById,
  memberBelongsToUnit,
  nodeById,
  rosterBreadcrumbChain,
  unitChildLayerLockReason,
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
  membersReadOnly?: boolean
  scopeRootNodeId?: string | null
}

export function RosterUnitView({
  tree,
  unitNodeId,
  error,
  busy,
  submit,
  readOnly = false,
  membersReadOnly = false,
  scopeRootNodeId = null,
}: RosterUnitViewProps) {
  const api = useApi()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const unit = nodeById(tree, unitNodeId)
  const layer = unit ? layerById(tree, unit.layerId) : undefined
  const tabs = useMemo(() => unitDetailTabs(tree, unitNodeId), [tree, unitNodeId])
  const isFellowshipUnit = layer?.standardType === 'Fellowship'
  const isCellUnit = layer?.standardType === 'Cell'
  const showTitleBack = isFellowshipUnit || isCellUnit
  const pageTabs = useMemo(
    () =>
      tabs.map((tab) => {
        if (tab.kind !== 'layer') {
          return {
            id: tab.id,
            label: isFellowshipUnit ? 'Fellowship members' : tab.label,
            count: tab.count,
          }
        }
        return {
          id: tab.id,
          label:
            isFellowshipUnit && tab.layer.standardType === 'Cell'
              ? 'Cells'
              : tab.layer.displayName,
          count: tab.count,
          locked: !isUnitChildLayerUnlocked(tree, unitNodeId, tab.layer),
          lockReason: unitChildLayerLockReason(tree, unitNodeId, tab.layer) ?? undefined,
        }
      }),
    [tabs, tree, unitNodeId, isFellowshipUnit],
  )
  const firstUnlockedTabId = pageTabs.find((tab) => !tab.locked)?.id ?? tabs[0]?.id ?? 'members'
  const [activeTabId, setActiveTabId] = useState(tabs[0]?.id ?? 'members')
  const [filterRules, setFilterRules] = useState<MemberFilterRule[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchField, setSearchField] = useState<MemberFilterField | 'all'>('all')
  const [memberSheet, setMemberSheet] = useState<MemberSheetState | null>(null)
  const [deleteMember, setDeleteMember] = useState<StructureMemberRow | null>(null)
  const [nodeSheet, setNodeSheet] = useState<UnitNodeSheetState | null>(null)
  const [createWizardOpen, setCreateWizardOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<StructureUnitNodeRow | null>(null)
  const [changeLeaderTarget, setChangeLeaderTarget] = useState<ChangeLeadershipTarget | null>(null)

  const memberRows = useMemo(() => {
    if (!unit) return []
    return buildMemberRows(tree).filter((row) =>
      memberBelongsToUnit(tree, unit.id, row.parentNodeId),
    )
  }, [tree, unit])

  const filteredMemberRows = useMemo(() => {
    let rows = applyMemberFilterRules(memberRows, filterRules)
    rows = applyMemberSearch(rows, searchQuery, searchField)
    return rows
  }, [memberRows, filterRules, searchQuery, searchField])

  const tabFromUrl = searchParams.get('tab')
  const presetFromUrl = searchParams.get('preset')

  useEffect(() => {
    const defaultTabId = firstUnlockedTabId
    const allowedTabIds = new Set(pageTabs.filter((tab) => !tab.locked).map((tab) => tab.id))
    const requestedTab =
      tabFromUrl && allowedTabIds.has(tabFromUrl) ? tabFromUrl : defaultTabId
    const nextTabId =
      pageTabs.find((tab) => tab.id === requestedTab && !tab.locked)?.id ?? defaultTabId
    setActiveTabId(nextTabId)
    setFilterRules(presetFromUrl === 'leaders' && nextTabId === 'members' ? leadersMemberFilterPreset() : [])
    setSearchQuery('')
    setSearchField('all')
  }, [unitNodeId, tabs, tabFromUrl, presetFromUrl, pageTabs, firstUnlockedTabId])

  function handleTabChange(nextTabId: string) {
    const nextTab = pageTabs.find((tab) => tab.id === nextTabId)
    if (nextTab?.locked) return
    setActiveTabId(nextTabId)
    const params = new URLSearchParams(searchParams)
    params.set('tab', nextTabId)
    if (nextTabId !== 'members') {
      params.delete('preset')
    }
    setSearchParams(params, { replace: true })
  }

  if (!unit || !layer) {
    return <Navigate to="/roster" replace />
  }

  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0]
  const breadcrumbs = [
    { label: 'Dashboard', to: '/' },
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
    setCreateWizardOpen(true)
  }

  const createPolicy =
    activeTab?.kind === 'layer' ? createUnitPolicy(tree, activeTab.layer, unit.id) : null

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
        title={
          isFellowshipUnit
            ? formatFellowshipName(unit.name)
            : isCellUnit
              ? formatCellName(unit.name)
              : unit.name
        }
        description={summary}
        onBack={showTitleBack ? handleBack : undefined}
        actions={
          <>
            {!showTitleBack && (
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
            )}

            {activeTab?.kind === 'layer' && !readOnly && createPolicy && (
              <AddFellowshipButton
                label={`Add new ${activeTab.layer.displayName.toLowerCase()}`}
                disabled={busy || !createPolicy.canAdd}
                title={createPolicy.blockedReason ?? undefined}
                onClick={openCreateNode}
              />
            )}

            {activeTab?.kind === 'members' && !membersReadOnly && (
              <Button className="shrink-0" onClick={() => setMemberSheet({ mode: 'create' })}>
                <Plus className="size-4" />
                Add member
              </Button>
            )}
          </>
        }
      />

      <StructurePageTabs tabs={pageTabs} activeId={activeTabId} onChange={handleTabChange} />

      {error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {activeTab?.kind === 'layer' && (
        <StructureUnitNodeTable
          tree={tree}
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
          onChangeLeader={(row) => {
            const node = nodeById(tree, row.id)
            if (!node) return
            setChangeLeaderTarget({
              nodeId: node.id,
              nodeName: node.name,
              unitNumber: node.unitNumber ?? '',
              layer: activeTab.layer,
            })
          }}
          onDelete={handleDeleteNode}
        />
      )}

      {activeTab?.kind === 'members' && (
        <StructureMemberTable
          rows={filteredMemberRows}
          structureLayers={getLayers(tree)}
          emptyMessage={`No members under ${unit.name} yet.${membersReadOnly ? '' : ' Add cells first if needed, then click Add member.'}`}
          onEdit={
            membersReadOnly
              ? undefined
              : (member) => navigate(`/roster/members/${member.id}/edit`)
          }
          onView={(member, destination: MemberViewDestination = 'profile') => {
            const suffix =
              destination === 'attendance'
                ? '/attendance'
                : destination === 'givings'
                  ? '/givings'
                  : ''
            navigate(`/roster/members/${member.id}${suffix}`)
          }}
          onDelete={membersReadOnly ? undefined : (member) => setDeleteMember(member)}
          compactLayout
          embedded
          readOnly={membersReadOnly}
          showSearch={false}
          toolbar={
            <MemberTableToolbar
              rows={memberRows}
              structureLayers={getLayers(tree)}
              rules={filterRules}
              onChangeRules={setFilterRules}
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
              searchField={searchField}
              onSearchFieldChange={setSearchField}
              filteredCount={filteredMemberRows.length}
              totalCount={memberRows.length}
              compact
            />
          }
        />
      )}

      {!membersReadOnly && deleteMember && (
        <MemberDeleteModal
          member={deleteMember}
          busy={busy}
          onClose={() => setDeleteMember(null)}
          onConfirm={() => {
            void submit(async () => {
              await api.delete(`/api/structure/members/${deleteMember.id}`)
              setDeleteMember(null)
            })
          }}
        />
      )}

      {!membersReadOnly && memberSheet && (
        <MemberFormSheet
          tree={tree}
          unitNodeId={unit.id}
          busy={busy}
          submit={submit}
          sheet={memberSheet}
          onClose={() => setMemberSheet(null)}
        />
      )}

      {!readOnly && createWizardOpen && activeTab?.kind === 'layer' && (
        <UnitCreateWizard
          tree={tree}
          layer={activeTab.layer}
          scopeUnitId={unit.id}
          busy={busy}
          submit={submit}
          onClose={() => setCreateWizardOpen(false)}
        />
      )}

      {!readOnly && changeLeaderTarget && (
        <ChangeLeadershipModal
          tree={tree}
          target={changeLeaderTarget}
          busy={busy}
          submit={submit}
          onClose={() => setChangeLeaderTarget(null)}
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
