import { useMemo, useState } from 'react'
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
import { useApi } from '@/api/useApi'
import type { StructureLayer, StructureTree } from '@/api/structure'
import { getLayers, nodesAtLayer, parentOptionsForLayer } from '@/lib/structure-tree'
import { buildNodeRows, type StructureNodeRow } from '@/lib/structure-table-rows'
import { StructurePageTabs } from '@/components/structure/structure-page-tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface RosterViewProps {
  tree: StructureTree
  error: string | null
  busy: boolean
  submit: (action: () => Promise<void>) => Promise<void>
  readOnly?: boolean
}

export function RosterView({ tree, error, busy, submit, readOnly = false }: RosterViewProps) {
  const layers = getLayers(tree)
  const [tab, setTab] = useState<string>(layers[0]?.id ?? '')
  const activeLayer = layers.find((l) => l.id === tab) ?? layers[0]

  const tabs = layers.map((layer) => ({
    id: layer.id,
    label: layer.displayName,
    count: nodesAtLayer(tree, layer.id).length,
  }))

  if (!activeLayer) return null

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 flex-1">
          <StructurePageTabs
            tabs={tabs.map((t) => ({ id: t.id, label: t.label, count: t.count }))}
            activeId={tab}
            onChange={setTab}
          />
        </div>

        <AddLayerButton
          layer={activeLayer}
          tree={tree}
          busy={busy}
          submit={submit}
          hidden={readOnly}
        />
      </div>

      {error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <LayerRosterTable tree={tree} layer={activeLayer} />
    </div>
  )
}

function AddLayerButton({
  layer,
  tree,
  busy,
  submit,
  hidden = false,
}: {
  layer: StructureLayer
  tree: StructureTree
  busy: boolean
  submit: RosterViewProps['submit']
  hidden?: boolean
}) {
  const api = useApi()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [parentNodeId, setParentNodeId] = useState('')
  const parentOptions = parentOptionsForLayer(tree, layer)
  const parentLayer = getLayers(tree)[layer.sortOrder - 1]
  const blocked = layer.sortOrder > 0 && parentOptions.length === 0

  if (hidden) return null

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
                    {n.name}
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

function LayerRosterTable({ tree, layer }: { tree: StructureTree; layer: StructureLayer }) {
  const rows = useMemo(() => buildNodeRows(tree, layer.id), [tree, layer.id])

  return (
    <RosterDataTable
      title={layer.displayName}
      description={`Org units at the ${layer.displayName} layer. Click a row to view members.`}
      data={rows}
      columns={nodeColumns}
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
const nodeColumns = [
  nodeHelper.accessor('name', {
    header: 'Name',
    cell: ({ row, getValue }) => (
      <Link
        to={`/roster/units/${row.original.id}`}
        className="font-medium text-foreground hover:text-primary hover:underline"
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
        to={`/roster/units/${row.original.id}`}
        className="tabular-nums text-primary hover:underline"
      >
        {getValue()}
      </Link>
    ),
  }),
]

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
                    {header.isPlaceholder ? null : (
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
