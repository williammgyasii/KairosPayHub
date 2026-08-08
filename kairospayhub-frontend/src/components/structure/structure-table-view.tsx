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
import { ArrowUpDown } from 'lucide-react'
import type { StructureTree } from '@/api/structure'
import { StructureChainFromLabels } from '@/components/structure/structure-chain'
import { Input } from '@/components/ui/input'
import {
  buildDefinitionRows,
  buildMemberRows,
  buildNodeRows,
  layerTabs,
  type StructureDefinitionRow,
  type StructureMemberRow,
  type StructureNodeRow,
} from '@/lib/structure-table-rows'
import { cn } from '@/lib/utils'

interface StructureTableViewProps {
  tree: StructureTree
}

export function StructureTableView({ tree }: StructureTableViewProps) {
  const tabs = layerTabs(tree)
  const [tab, setTab] = useState<string>('definition')
  const templateName = tree.template?.name ?? 'Structure'

  const definitionRows = useMemo(() => buildDefinitionRows(tree), [tree])
  const memberRows = useMemo(() => buildMemberRows(tree), [tree])
  const activeLayerTab = tabs.find((t) => t.id === tab && t.id !== 'members' && t.id !== 'definition')
  const nodeRows = useMemo(
    () => (activeLayerTab && 'layer' in activeLayerTab ? buildNodeRows(tree, activeLayerTab.id) : []),
    [tree, activeLayerTab],
  )

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border/60 bg-muted/20 px-5 py-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Saved structure</p>
        <h2 className="mt-1 text-lg font-semibold tracking-tight">{templateName}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{tree.churchName}</p>
        {tree.template && (
          <StructureChainFromLabels
            labels={tree.template.layers.map((layer) => layer.displayName)}
            includeChurch
            className="mt-3"
          />
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              'rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
              tab === t.id
                ? 'border-primary/30 bg-primary/10 text-primary'
                : 'border-border/60 text-muted-foreground hover:bg-accent/50 hover:text-foreground',
            )}
          >
            {t.label}
            <span className="ml-1.5 tabular-nums opacity-70">{t.count}</span>
          </button>
        ))}
      </div>

      {tab === 'definition' ? (
        <DataTable
          title="Layer definition"
          description={`How ${templateName} is organized from church down to members.`}
          data={definitionRows}
          columns={definitionColumns}
          searchPlaceholder="Search layers…"
          searchColumn="displayName"
          emptyMessage="No layers defined."
        />
      ) : tab === 'members' ? (
        <DataTable
          title="Member roster"
          description={`Everyone in ${tree.churchName}, with their full path.`}
          data={memberRows}
          columns={memberColumns}
          searchPlaceholder="Search members…"
          searchColumn="member"
          emptyMessage="No members yet. Switch to Editor to add members."
        />
      ) : (
        activeLayerTab &&
        'layer' in activeLayerTab && (
          <DataTable
            title={activeLayerTab.label}
            description={`All ${activeLayerTab.label.toLowerCase()} nodes in your structure.`}
            data={nodeRows}
            columns={nodeColumns}
            searchPlaceholder={`Search ${activeLayerTab.label.toLowerCase()}…`}
            searchColumn="name"
            emptyMessage={`No ${activeLayerTab.label.toLowerCase()} yet.`}
          />
        )
      )}
    </div>
  )
}

const definitionHelper = createColumnHelper<StructureDefinitionRow>()
const definitionColumns = [
  definitionHelper.accessor('order', {
    header: '#',
    cell: (info) => <span className="tabular-nums">{info.getValue()}</span>,
  }),
  definitionHelper.accessor('standardType', { header: 'Standard type' }),
  definitionHelper.accessor('displayName', { header: 'Display name' }),
]

const memberHelper = createColumnHelper<StructureMemberRow>()
const memberColumns = [
  memberHelper.accessor('member', { header: 'Member' }),
  memberHelper.accessor('phone', { header: 'Phone' }),
  memberHelper.accessor('age', { header: 'Age' }),
  memberHelper.accessor('role', { header: 'Role' }),
  memberHelper.accessor('path', { header: 'Path' }),
]

const nodeHelper = createColumnHelper<StructureNodeRow>()
const nodeColumns = [
  nodeHelper.accessor('name', { header: 'Name' }),
  nodeHelper.accessor('parent', { header: 'Parent' }),
  nodeHelper.accessor('memberCount', {
    header: 'Members',
    cell: (info) => <span className="tabular-nums">{info.getValue()}</span>,
  }),
]

function DataTable<T extends object>({
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
        <table className="w-full min-w-[560px] text-sm">
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

      <div className="border-t border-border/60 px-5 py-2 text-xs text-muted-foreground">
        {table.getFilteredRowModel().rows.length} row
        {table.getFilteredRowModel().rows.length === 1 ? '' : 's'}
      </div>
    </section>
  )
}
