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
import { Link } from 'react-router-dom'
import type { StructureLayer, StructureTree } from '@/api/structure'
import type { StructureUnitNodeRow } from '@/lib/structure-table-rows'
import {
  CountBadge,
  StructurePathBadges,
  StructureSegmentBadge,
} from '@/components/structure/structure-badges'
import { RosterUnitActionsMenu } from '@/components/structure/roster-unit-actions-menu'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface StructureUnitNodeTableProps {
  tree: StructureTree
  rows: StructureUnitNodeRow[]
  layer: Pick<StructureLayer, 'id' | 'displayName' | 'standardType'>
  childLayer?: Pick<StructureLayer, 'displayName' | 'standardType'>
  emptyMessage?: string
  hidePathColumn?: boolean
  hideParentColumn?: boolean
  embedded?: boolean
  onEdit: (row: StructureUnitNodeRow) => void
  onDelete: (row: StructureUnitNodeRow) => void
  onChangeLeader?: (row: StructureUnitNodeRow) => void
  className?: string
  readOnly?: boolean
}

export function StructureUnitNodeTable({
  tree,
  rows,
  layer,
  childLayer,
  emptyMessage,
  hidePathColumn = false,
  hideParentColumn = false,
  embedded = false,
  onEdit,
  onDelete,
  onChangeLeader,
  className,
  readOnly = false,
}: StructureUnitNodeTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [filter, setFilter] = useState('')

  const columns = useMemo(
    () =>
      createUnitNodeColumns(tree, layer, childLayer, { hidePathColumn, hideParentColumn, readOnly }, {
        onEdit,
        onDelete,
        onChangeLeader,
      }),
    [tree, layer, childLayer, hidePathColumn, hideParentColumn, onEdit, onDelete, onChangeLeader, readOnly],
  )

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, globalFilter: filter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: (row, _columnId, filterValue) => {
      const q = String(filterValue).toLowerCase()
      if (!q) return true
      return (
        row.original.name.toLowerCase().includes(q) ||
        row.original.unitNumber.toLowerCase().includes(q) ||
        row.original.leaderName.toLowerCase().includes(q)
      )
    },
  })

  return (
    <section
      className={cn('overflow-hidden rounded-xl border border-border/60 bg-background', className)}
    >
      <div className="flex flex-col gap-3 border-b border-border/60 px-5 py-4 sm:flex-row sm:items-end sm:justify-between">
        {!embedded ? (
          <div>
            <h2 className="text-sm font-semibold tracking-tight">{layer.displayName}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {rows.length} {layer.displayName.toLowerCase()}
              {rows.length === 1 ? '' : 's'} in this unit
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {rows.length} {layer.displayName.toLowerCase()}
            {rows.length === 1 ? '' : 's'}
          </p>
        )}
        <Input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder={`Search ${layer.displayName.toLowerCase()}…`}
          className="h-9 max-w-xs"
        />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
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
                <td colSpan={columns.length} className="px-5 py-10 text-center text-muted-foreground">
                  {emptyMessage ??
                    `No ${layer.displayName.toLowerCase()} in this unit yet. Use Add above.`}
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

function createUnitNodeColumns(
  tree: StructureTree,
  _layer: Pick<StructureLayer, 'displayName' | 'standardType'>,
  childLayer: Pick<StructureLayer, 'displayName' | 'standardType'> | undefined,
  options: { hidePathColumn: boolean; hideParentColumn: boolean; readOnly?: boolean },
  actions: {
    onEdit: (row: StructureUnitNodeRow) => void
    onDelete: (row: StructureUnitNodeRow) => void
    onChangeLeader?: (row: StructureUnitNodeRow) => void
  },
) {
  const helper = createColumnHelper<StructureUnitNodeRow>()
  const readOnly = options.readOnly ?? false

  return [
    helper.accessor('name', {
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
    helper.accessor('unitNumber', {
      header: `${_layer.displayName} number`,
      sortingFn: (rowA, rowB) => {
        const a = Number.parseInt(rowA.original.unitNumber, 10)
        const b = Number.parseInt(rowB.original.unitNumber, 10)
        if (!Number.isNaN(a) && !Number.isNaN(b)) return a - b
        if (!Number.isNaN(a)) return -1
        if (!Number.isNaN(b)) return 1
        return rowA.original.unitNumber.localeCompare(rowB.original.unitNumber)
      },
      cell: ({ getValue }) => (
        <span className="tabular-nums text-muted-foreground">{getValue() || '—'}</span>
      ),
    }),
    helper.accessor('leaderName', {
      header: 'Leader',
      cell: ({ getValue }) => getValue() || '—',
    }),
    ...(options.hidePathColumn
      ? []
      : [
          helper.display({
            id: 'path',
            header: 'Under',
            cell: ({ row }) => <StructurePathBadges segments={row.original.pathSegments} />,
          }),
        ]),
    ...(options.hideParentColumn
      ? []
      : [
          helper.display({
            id: 'parent',
            header: 'Parent',
            cell: ({ row }) =>
              row.original.parentSegment ? (
                <StructureSegmentBadge segment={row.original.parentSegment} showLayer />
              ) : (
                <span className="text-muted-foreground">—</span>
              ),
          }),
        ]),
    helper.display({
      id: 'stats',
      header: 'Counts',
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1.5">
          {childLayer && row.original.childUnitCount > 0 && (
            <CountBadge
              label={childLayer.displayName.toLowerCase()}
              count={row.original.childUnitCount}
            />
          )}
          <CountBadge
            label="member"
            count={row.original.memberCount}
            className={row.original.memberCount > 0 ? 'bg-primary/10 text-primary' : undefined}
          />
        </div>
      ),
    }),
    helper.display({
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <RosterUnitActionsMenu
          tree={tree}
          unitId={row.original.id}
          unitName={row.original.name}
          readOnly={readOnly}
          onChangeLeader={
            readOnly || !actions.onChangeLeader
              ? undefined
              : () => actions.onChangeLeader!(row.original)
          }
          onEdit={readOnly ? undefined : () => actions.onEdit(row.original)}
          onDelete={readOnly ? undefined : () => actions.onDelete(row.original)}
        />
      ),
    }),
  ]
}
