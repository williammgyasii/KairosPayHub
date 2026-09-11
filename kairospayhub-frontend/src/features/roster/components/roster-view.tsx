import { useEffect, useMemo, useState } from 'react'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
  type VisibilityState,
} from '@tanstack/react-table'
import { ArrowUpDown, Columns3 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useApi } from '@/shared/api'
import type { StructureLayer, StructureTree } from '@/api/structure'
import { AddFellowshipButton } from '@/features/roster/components/add-fellowship-button'
import {
  ChangeLeadershipModal,
  type ChangeLeadershipTarget,
} from '@/features/roster/components/change-leadership-modal'
import { UnitCreateWizard } from '@/features/roster/components/unit-create-wizard'
import { RosterUnitActionsMenu } from '@/features/roster/components/roster-unit-actions-menu'
import { StructurePageTabs } from '@/shared/ui/page-tabs'
import { UnitDeleteModal } from '@/features/roster/components/unit-delete-modal'
import {
  UnitNodeFormSheet,
  type UnitNodeSheetState,
} from '@/features/roster/components/unit-node-form-sheet'
import { ColumnToggleSwitch } from '@/shared/ui/column-toggle-switch'
import { Button } from '@/shared/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import { Input } from '@/shared/ui/input'
import { createUnitPolicy, type CreateUnitActor } from '@/shared/lib/create-unit-policy'
import { buildNodeRows, type StructureNodeRow, type StructureUnitNodeRow } from '@/lib/structure-table-rows'
import {
  displayUnitNumber,
  isRosterLayerUnlocked,
  nodesAtLayer,
  nodeById,
  resolveNodeLeader,
  rosterLayerLockReason,
  rosterLayersForScope,
  unitDeleteImpact,
} from '@/shared/lib/structure-tree'
import { unitEditMenuLabel, unitEditPolicy } from '@/lib/unit-edit-policy'
import { TABLE_PREFERENCE_KEYS } from '@/lib/table-preferences'
import { usePersistedColumnVisibility } from '@/lib/use-persisted-column-visibility'
import {
  UNITS_ALWAYS_VISIBLE_COLUMN_IDS,
  UNITS_TOGGLEABLE_COLUMN_IDS,
  defaultUnitsColumnVisibility,
  mergeUnitsColumnVisibility,
  unitsColumnLabel,
} from '@/features/roster/lib/units-table-columns'

interface RosterViewProps {
  tree: StructureTree
  error: string | null
  busy: boolean
  submit: (action: () => Promise<void>) => Promise<void>
  readOnly?: boolean
  canManageChurch?: boolean
  scopeRootNodeId?: string | null
  actorScopeNodeId?: string | null
  createActor?: CreateUnitActor | null
}

function nodeRowToUnitEditRow(
  tree: StructureTree,
  row: StructureNodeRow,
  layer: StructureLayer,
): StructureUnitNodeRow {
  const node = nodeById(tree, row.id)
  const leader = resolveNodeLeader(tree, row.id)
  return {
    id: row.id,
    name: row.name,
    unitNumber: node ? displayUnitNumber(tree, node.id) : '',
    leaderMemberId: leader.leaderMemberId,
    leaderName: leader.leaderName,
    memberCount: row.memberCount,
    childUnitCount: 0,
    parentSegment: null,
    pathSegments: [],
    layerId: layer.id,
  }
}

export function RosterView({
  tree,
  error,
  busy,
  submit,
  readOnly = false,
  canManageChurch = !readOnly,
  scopeRootNodeId = null,
  actorScopeNodeId = null,
  createActor = null,
}: RosterViewProps) {
  const api = useApi()
  const layers = useMemo(
    () => rosterLayersForScope(tree, scopeRootNodeId),
    [tree, scopeRootNodeId],
  )
  const [tab, setTab] = useState<string>(layers[0]?.id ?? '')
  const [createWizardOpen, setCreateWizardOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<StructureNodeRow | null>(null)
  const [changeLeaderTarget, setChangeLeaderTarget] = useState<ChangeLeadershipTarget | null>(null)
  const [nodeSheet, setNodeSheet] = useState<UnitNodeSheetState | null>(null)
  const unitsDefaults = useMemo(() => defaultUnitsColumnVisibility(), [])
  const [columnVisibility, setColumnVisibility] = usePersistedColumnVisibility(
    TABLE_PREFERENCE_KEYS.units,
    unitsDefaults,
    { alwaysOn: UNITS_ALWAYS_VISIBLE_COLUMN_IDS },
  )
  const activeLayer = layers.find((l) => l.id === tab) ?? layers[0]
  const createPolicy = activeLayer
    ? createUnitPolicy(tree, activeLayer, scopeRootNodeId, createActor)
    : null

  const deleteImpact = useMemo(
    () => (deleteTarget ? unitDeleteImpact(tree, deleteTarget.id) : null),
    [deleteTarget, tree],
  )

  const tabs = useMemo(
    () =>
      layers.map((layer) => ({
        id: layer.id,
        label: layer.displayName,
        count: nodesAtLayer(tree, layer.id).length,
        locked: !isRosterLayerUnlocked(tree, layer),
        lockReason: rosterLayerLockReason(tree, layer) ?? undefined,
      })),
    [layers, tree],
  )

  const firstUnlockedTabId = tabs.find((item) => !item.locked)?.id ?? layers[0]?.id ?? ''

  useEffect(() => {
    const current = tabs.find((item) => item.id === tab)
    if (!current || current.locked) {
      setTab(firstUnlockedTabId)
    }
  }, [scopeRootNodeId, tabs, tab, firstUnlockedTabId])

  if (!activeLayer) return null

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 flex-1">
          <StructurePageTabs tabs={tabs} activeId={tab} onChange={setTab} />
        </div>

        {createPolicy?.canAdd && (
          <AddFellowshipButton
            label={`Add new ${activeLayer.displayName.toLowerCase()}`}
            disabled={busy}
            title={createPolicy.blockedReason ?? undefined}
            onClick={() => setCreateWizardOpen(true)}
          />
        )}
      </div>

      {error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <LayerRosterTable
        tree={tree}
        layer={activeLayer}
        canManageChurch={canManageChurch}
        hasCreateChildUnits={Boolean(createActor?.hasCreateChildUnits)}
        actorScopeNodeId={actorScopeNodeId}
        columnVisibility={columnVisibility}
        onColumnVisibilityChange={setColumnVisibility}
        onDelete={(row) => setDeleteTarget(row)}
        onEdit={(row) => {
          const policy = unitEditPolicy({
            tree,
            canManageChurch,
            hasCreateChildUnits: createActor?.hasCreateChildUnits,
            actorScopeNodeId,
            unitId: row.id,
          })
          if (!policy.canRename) return
          setNodeSheet({
            mode: 'edit',
            row: nodeRowToUnitEditRow(tree, row, activeLayer),
            layer: activeLayer,
            renameOnly: policy.renameOnly,
          })
        }}
        onChangeLeader={(row) => {
          const node = nodeById(tree, row.id)
          if (!node) return
          setChangeLeaderTarget({
            nodeId: node.id,
            nodeName: node.name,
            unitNumber: node.unitNumber ?? '',
            layer: activeLayer,
          })
        }}
      />

      {deleteTarget && (
        <UnitDeleteModal
          impact={deleteImpact}
          busy={busy}
          onConfirm={() => {
            if (!deleteTarget) return
            void submit(async () => {
              await api.delete(`/api/structure/nodes/${deleteTarget.id}`)
              setDeleteTarget(null)
            })
          }}
          onClose={() => setDeleteTarget(null)}
        />
      )}

      {canManageChurch && changeLeaderTarget && (
        <ChangeLeadershipModal
          tree={tree}
          target={changeLeaderTarget}
          busy={busy}
          submit={submit}
          onClose={() => setChangeLeaderTarget(null)}
        />
      )}

      {createPolicy?.canAdd && createWizardOpen && (
        <UnitCreateWizard
          tree={tree}
          layer={activeLayer}
          scopeUnitId={scopeRootNodeId}
          busy={busy}
          submit={submit}
          onClose={() => setCreateWizardOpen(false)}
        />
      )}

      {nodeSheet && (
        <UnitNodeFormSheet
          tree={tree}
          unitNodeId={nodeSheet.mode === 'edit' ? nodeSheet.row.id : scopeRootNodeId ?? nodeSheet.parentNodeId}
          busy={busy}
          submit={submit}
          sheet={nodeSheet}
          onClose={() => setNodeSheet(null)}
        />
      )}
    </div>
  )
}

function LayerRosterTable({
  tree,
  layer,
  canManageChurch,
  hasCreateChildUnits,
  actorScopeNodeId,
  columnVisibility,
  onColumnVisibilityChange,
  onDelete,
  onEdit,
  onChangeLeader,
}: {
  tree: StructureTree
  layer: StructureLayer
  canManageChurch: boolean
  hasCreateChildUnits: boolean
  actorScopeNodeId: string | null
  columnVisibility: VisibilityState
  onColumnVisibilityChange: (visibility: VisibilityState) => void
  onDelete: (row: StructureNodeRow) => void
  onEdit: (row: StructureNodeRow) => void
  onChangeLeader: (row: StructureNodeRow) => void
}) {
  const rows = useMemo(() => buildNodeRows(tree, layer.id), [tree, layer.id])
  const columns = useMemo(
    () =>
      createRosterNodeColumns(tree, layer, {
        canManageChurch,
        hasCreateChildUnits,
        actorScopeNodeId,
        onDelete,
        onEdit,
        onChangeLeader,
      }),
    [tree, layer, canManageChurch, hasCreateChildUnits, actorScopeNodeId, onDelete, onEdit, onChangeLeader],
  )

  return (
    <RosterDataTable
      title={layer.displayName}
      description={`Org units at the ${layer.displayName} layer. Click a row or use the menu to drill in.`}
      data={rows}
      columns={columns}
      searchPlaceholder={`Search ${layer.displayName.toLowerCase()}…`}
      emptyMessage={`No ${layer.displayName.toLowerCase()} yet. Use Add new ${layer.displayName} above.`}
      columnVisibility={columnVisibility}
      onColumnVisibilityChange={onColumnVisibilityChange}
    />
  )
}

export function RosterEmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-6 py-10 text-center">
      <p className="text-sm font-medium">No structure template yet</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Define your church structure first, then add units here.
      </p>
      <Button asChild className="mt-4">
        <Link to="/structure">Go to Structure</Link>
      </Button>
    </div>
  )
}

function createRosterNodeColumns(
  tree: StructureTree,
  layer: StructureLayer,
  actions: {
    canManageChurch: boolean
    hasCreateChildUnits: boolean
    actorScopeNodeId: string | null
    onDelete: (row: StructureNodeRow) => void
    onEdit: (row: StructureNodeRow) => void
    onChangeLeader: (row: StructureNodeRow) => void
  },
) {
  const nodeHelper = createColumnHelper<StructureNodeRow>()

  return [
    nodeHelper.accessor('name', {
      enableHiding: false,
      header: 'Name',
      cell: ({ row, getValue }) => (
        <Link
          to={`/roster/units/${row.original.id}`}
          className="block max-w-[14rem] truncate font-medium whitespace-nowrap text-foreground hover:text-primary hover:underline"
        >
          {getValue()}
        </Link>
      ),
    }),
    nodeHelper.accessor('parent', { header: 'Parent' }),
    nodeHelper.accessor('memberCount', {
      header: 'Members',
      cell: ({ row, getValue }) => (
        <Link
          to={`/roster/units/${row.original.id}?tab=members`}
          className="tabular-nums text-primary hover:underline"
        >
          {getValue()}
        </Link>
      ),
    }),
    nodeHelper.display({
      id: 'actions',
      enableHiding: false,
      header: '',
      cell: ({ row }) => {
        const policy = unitEditPolicy({
          tree,
          canManageChurch: actions.canManageChurch,
          hasCreateChildUnits: actions.hasCreateChildUnits,
          actorScopeNodeId: actions.actorScopeNodeId,
          unitId: row.original.id,
        })
        return (
          <RosterUnitActionsMenu
            tree={tree}
            unitId={row.original.id}
            unitName={row.original.name}
            editLabel={unitEditMenuLabel(layer.displayName)}
            onChangeLeader={
              policy.canChangeLeader ? () => actions.onChangeLeader(row.original) : undefined
            }
            onEdit={policy.canRename ? () => actions.onEdit(row.original) : undefined}
            onDelete={policy.canDelete ? () => actions.onDelete(row.original) : undefined}
          />
        )
      },
    }),
  ]
}

function RosterDataTable({
  title,
  description,
  data,
  columns,
  searchPlaceholder,
  emptyMessage,
  columnVisibility,
  onColumnVisibilityChange,
}: {
  title: string
  description: string
  data: StructureNodeRow[]
  columns: ReturnType<typeof createRosterNodeColumns>
  searchPlaceholder: string
  emptyMessage: string
  columnVisibility: VisibilityState
  onColumnVisibilityChange: (visibility: VisibilityState) => void
}) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [filter, setFilter] = useState('')

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter: filter, columnVisibility },
    onSortingChange: setSorting,
    onGlobalFilterChange: setFilter,
    onColumnVisibilityChange: (updater) => {
      const next = typeof updater === 'function' ? updater(columnVisibility) : updater
      onColumnVisibilityChange(mergeUnitsColumnVisibility(columnVisibility, next))
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  return (
    <section className="overflow-hidden rounded-xl border border-border/60 bg-background">
      <div className="flex flex-col gap-3 border-b border-border/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        </div>
        <div className="flex w-full max-w-md items-center gap-2">
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-9 w-full"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" size="sm" variant="outline" className="h-9 shrink-0 gap-1.5">
                <Columns3 className="size-3.5" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Show columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled className="justify-between gap-3 opacity-100">
                Name
                <ColumnToggleSwitch on />
              </DropdownMenuItem>
              {UNITS_TOGGLEABLE_COLUMN_IDS.map((columnId) => (
                <DropdownMenuItem
                  key={columnId}
                  className="justify-between gap-3"
                  onSelect={(event) => {
                    event.preventDefault()
                    onColumnVisibilityChange(
                      mergeUnitsColumnVisibility(columnVisibility, {
                        [columnId]: !columnVisibility[columnId],
                      }),
                    )
                  }}
                >
                  {unitsColumnLabel(columnId)}
                  <ColumnToggleSwitch on={Boolean(columnVisibility[columnId])} />
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-border/60 bg-muted/20 text-left">
                {hg.headers.map((header) => (
                  <th key={header.id} className="px-5 py-2.5 font-medium text-muted-foreground">
                    {header.isPlaceholder || header.column.id === 'actions' ? null : (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 hover:text-foreground"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        <ArrowUpDown className="size-3 opacity-50" />
                      </button>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-5 py-10 text-center text-muted-foreground">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-border/40 last:border-0 hover:bg-muted/10"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-5 py-3 align-middle">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
