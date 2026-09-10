import { useEffect, useMemo, useState } from 'react'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table'
import { ArrowUpDown } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useApi } from '@/api/core'
import type { StructureLayer, StructureTree } from '@/api/structure'
import { AddFellowshipButton } from '@/components/structure/add-fellowship-button'
import {
  ChangeLeadershipModal,
  type ChangeLeadershipTarget,
} from '@/components/structure/change-leadership-modal'
import { UnitCreateWizard } from '@/components/structure/unit-create-wizard'
import { RosterUnitActionsMenu } from '@/components/structure/roster-unit-actions-menu'
import { StructurePageTabs } from '@/components/structure/structure-page-tabs'
import { UnitDeleteModal } from '@/components/structure/unit-delete-modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createUnitPolicy } from '@/lib/create-unit-policy'
import { buildNodeRows, type StructureNodeRow } from '@/lib/structure-table-rows'
import {
  isRosterLayerUnlocked,
  nodesAtLayer,
  nodeById,
  rosterLayerLockReason,
  rosterLayersForScope,
  unitDeleteImpact,
} from '@/lib/structure-tree'

interface RosterViewProps {
  tree: StructureTree
  error: string | null
  busy: boolean
  submit: (action: () => Promise<void>) => Promise<void>
  readOnly?: boolean
  scopeRootNodeId?: string | null
}

export function RosterView({
  tree,
  error,
  busy,
  submit,
  readOnly = false,
  scopeRootNodeId = null,
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
  const activeLayer = layers.find((l) => l.id === tab) ?? layers[0]
  const createPolicy = activeLayer
    ? createUnitPolicy(tree, activeLayer, scopeRootNodeId)
    : null

  const deleteImpact = useMemo(
    () => (deleteTarget ? unitDeleteImpact(tree, deleteTarget.id) : null),
    [deleteTarget, tree],
  )

  const canDeleteLayerUnits = (layer: StructureLayer) =>
    layer.standardType === 'Fellowship' || layer.standardType === 'Cell'

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

        {!readOnly && createPolicy && (
          <AddFellowshipButton
            label={`Add new ${activeLayer.displayName.toLowerCase()}`}
            disabled={busy || !createPolicy.canAdd}
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
        readOnly={readOnly}
        canDelete={canDeleteLayerUnits(activeLayer)}
        onDelete={(row) => setDeleteTarget(row)}
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

      {!readOnly && deleteTarget && (
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

      {!readOnly && changeLeaderTarget && (
        <ChangeLeadershipModal
          tree={tree}
          target={changeLeaderTarget}
          busy={busy}
          submit={submit}
          onClose={() => setChangeLeaderTarget(null)}
        />
      )}

      {!readOnly && createWizardOpen && (
        <UnitCreateWizard
          tree={tree}
          layer={activeLayer}
          scopeUnitId={scopeRootNodeId}
          busy={busy}
          submit={submit}
          onClose={() => setCreateWizardOpen(false)}
        />
      )}
    </div>
  )
}

function LayerRosterTable({
  tree,
  layer,
  readOnly,
  canDelete,
  onDelete,
  onChangeLeader,
}: {
  tree: StructureTree
  layer: StructureLayer
  readOnly: boolean
  canDelete: boolean
  onDelete: (row: StructureNodeRow) => void
  onChangeLeader: (row: StructureNodeRow) => void
}) {
  const rows = useMemo(() => buildNodeRows(tree, layer.id), [tree, layer.id])
  const columns = useMemo(
    () =>
      createRosterNodeColumns(tree, {
        readOnly,
        canDelete,
        onDelete,
        onChangeLeader,
      }),
    [tree, readOnly, canDelete, onDelete, onChangeLeader],
  )

  return (
    <RosterDataTable
      title={layer.displayName}
      description={`Org units at the ${layer.displayName} layer. Click a row or use the menu to drill in.`}
      data={rows}
      columns={columns}
      searchPlaceholder={`Search ${layer.displayName.toLowerCase()}…`}
      searchColumn="name"
      emptyMessage={`No ${layer.displayName.toLowerCase()} yet. Use Add new ${layer.displayName} above.`}
    />
  )
}

export function RosterEmptyState() {
  return (
    <section className="rounded-xl border border-border/60 bg-muted/10 px-5 py-8 text-center">
      <p className="text-sm font-medium">Define your structure first</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Roster tabs appear after you save your layer chain on the Structure page.
      </p>
      <Button asChild className="mt-4">
        <Link to="/structure">Go to Structure</Link>
      </Button>
    </section>
  )
}

const nodeHelper = createColumnHelper<StructureNodeRow>()

function createRosterNodeColumns(
  tree: StructureTree,
  {
    readOnly,
    canDelete,
    onDelete,
    onChangeLeader,
  }: {
    readOnly: boolean
    canDelete: boolean
    onDelete: (row: StructureNodeRow) => void
    onChangeLeader: (row: StructureNodeRow) => void
  },
) {
  return [
    nodeHelper.accessor('name', {
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
      header: '',
      cell: ({ row }) => (
        <RosterUnitActionsMenu
          tree={tree}
          unitId={row.original.id}
          unitName={row.original.name}
          readOnly={readOnly}
          onChangeLeader={!readOnly ? () => onChangeLeader(row.original) : undefined}
          onDelete={canDelete && !readOnly ? () => onDelete(row.original) : undefined}
        />
      ),
    }),
  ]
}

function RosterDataTable<T extends object>({
  title,
  description,
  data,
  columns,
  searchPlaceholder,
  searchColumn,
  emptyMessage,
}: {
  title: string
  description: string
  data: T[]
  columns: Parameters<typeof useReactTable<T>>[0]['columns']
  searchPlaceholder: string
  searchColumn: keyof T & string
  emptyMessage: string
}) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [filter, setFilter] = useState('')

  const table = useReactTable({
    data,
    columns: columns ?? [],
    state: { sorting, globalFilter: filter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: (row, _columnId, filterValue) => {
      const q = String(filterValue).toLowerCase()
      if (!q) return true
      return String(row.getValue(searchColumn)).toLowerCase().includes(q)
    },
  })

  return (
    <section className="overflow-hidden rounded-xl border border-border/60 bg-background">
      <div className="flex flex-col gap-3 border-b border-border/60 px-5 py-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        </div>
        <Input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder={searchPlaceholder}
          className="h-9 max-w-xs"
        />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] text-sm">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-border/60 bg-muted/20 text-left">
                {hg.headers.map((header) => (
                  <th key={header.id} className="px-5 py-2.5 font-medium text-muted-foreground">
                    {header.isPlaceholder ? null : header.column.id === 'actions' ? null : (
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
                <td
                  colSpan={columns?.length ?? 1}
                  className="px-5 py-10 text-center text-muted-foreground"
                >
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
                    <td key={cell.id} className="px-5 py-3">
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
