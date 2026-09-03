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
import { ArrowUpDown, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useApi } from '@/api/core'
import type { StructureLayer, StructureTree } from '@/api/structure'
import { AddFellowshipButton } from '@/components/structure/add-fellowship-button'
import {
  ChangeLeadershipModal,
  type ChangeLeadershipTarget,
} from '@/components/structure/change-leadership-modal'
import { FellowshipCreateWizard } from '@/components/structure/fellowship-create-wizard'
import { RosterUnitActionsMenu } from '@/components/structure/roster-unit-actions-menu'
import { StructurePageTabs } from '@/components/structure/structure-page-tabs'
import { UnitDeleteModal } from '@/components/structure/unit-delete-modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { buildNodeRows, type StructureNodeRow } from '@/lib/structure-table-rows'
import {
  getLayers,
  isRosterLayerUnlocked,
  layerParentOptions,
  layerRequiresParent,
  nodesAtLayer,
  nodeById,
  resolveLayerParentId,
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
  const [fellowshipWizardOpen, setFellowshipWizardOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<StructureNodeRow | null>(null)
  const [changeLeaderTarget, setChangeLeaderTarget] = useState<ChangeLeadershipTarget | null>(null)
  const activeLayer = layers.find((l) => l.id === tab) ?? layers[0]

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

  const fellowshipParentOptions = layerParentOptions(tree, activeLayer, scopeRootNodeId)
  const fellowshipParentId = resolveLayerParentId(fellowshipParentOptions) ?? ''

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 flex-1">
          <StructurePageTabs tabs={tabs} activeId={tab} onChange={setTab} />
        </div>

        <AddLayerButton
          layer={activeLayer}
          tree={tree}
          scopeRootNodeId={scopeRootNodeId}
          busy={busy}
          submit={submit}
          hidden={readOnly}
          onOpenFellowshipWizard={() => setFellowshipWizardOpen(true)}
        />
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

      {!readOnly && fellowshipWizardOpen && activeLayer.standardType === 'Fellowship' && (
        <FellowshipCreateWizard
          tree={tree}
          unitNodeId={scopeRootNodeId}
          layer={activeLayer}
          parentNodeId={fellowshipParentId}
          busy={busy}
          submit={submit}
          onClose={() => setFellowshipWizardOpen(false)}
        />
      )}
    </div>
  )
}

function AddLayerButton({
  layer,
  tree,
  scopeRootNodeId = null,
  busy,
  submit,
  hidden = false,
  onOpenFellowshipWizard,
}: {
  layer: StructureLayer
  tree: StructureTree
  scopeRootNodeId?: string | null
  busy: boolean
  submit: RosterViewProps['submit']
  hidden?: boolean
  onOpenFellowshipWizard: () => void
}) {
  const api = useApi()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [parentNodeId, setParentNodeId] = useState('')
  const parentOptions = layerParentOptions(tree, layer, scopeRootNodeId)
  const parentLayer = getLayers(tree)[layer.sortOrder - 1]
  const isFellowship = layer.standardType === 'Fellowship'
  const blocked =
    isFellowship
      ? layerRequiresParent(tree, layer) && parentOptions.length === 0
      : layer.sortOrder > 0 && parentOptions.length === 0

  if (hidden) return null

  if (isFellowship) {
    return (
      <AddFellowshipButton
        label={`Add new ${layer.displayName.toLowerCase()}`}
        disabled={busy || blocked}
        onClick={onOpenFellowshipWizard}
      />
    )
  }

  return (
    <div className="relative">
      <Button
        size="sm"
        disabled={busy || blocked}
        onClick={() => setOpen((v) => !v)}
        title={blocked ? `Add a ${parentLayer?.displayName ?? 'parent'} first` : undefined}
      >
        <Plus className="size-4" />
        Add new {layer.displayName}
      </Button>

      {open && !blocked && (
        <form
          className="absolute right-0 top-full z-10 mt-2 w-72 space-y-3 rounded-xl border border-border/60 bg-background p-4 shadow-lg"
          onSubmit={(e) => {
            e.preventDefault()
            void submit(async () => {
              await api.post('/api/structure/nodes', {
                layerId: layer.id,
                parentNodeId: layer.sortOrder === 0 ? null : parentNodeId || null,
                name,
              })
              setName('')
              setParentNodeId('')
              setOpen(false)
            })
          }}
        >
          {layer.sortOrder > 0 && (
            <div className="space-y-1">
              <Label className="text-xs">Parent {parentLayer?.displayName}</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={parentNodeId}
                onChange={(e) => setParentNodeId(e.target.value)}
                required
              >
                <option value="">Select…</option>
                {parentOptions.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.label}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="space-y-1">
            <Label className="text-xs">{layer.displayName} name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={busy} className="flex-1">
              Save
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
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
