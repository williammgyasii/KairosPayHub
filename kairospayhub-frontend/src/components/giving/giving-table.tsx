import { useMemo, useState } from 'react'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import { ArrowRight, ArrowUpDown } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { GivingProgram } from '@/api/giving'
import { formatAmount } from '@/api/giving'
import type { GivingCampaignStats } from '@/components/giving/giving-metrics'
import { givingTypeLabel, scopeKindLabel } from '@/lib/giving-ui'
import { ProgramStatusBadge, ScopeKindBadge } from '@/components/giving/giving-badges'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export type GivingTableRow = GivingProgram & {
  stats?: GivingCampaignStats
}

const columnHelper = createColumnHelper<GivingTableRow>()

interface GivingTableProps {
  rows: GivingTableRow[]
  showTotals?: boolean
  emptyMessage?: string
}

export function GivingTable({
  rows,
  showTotals = false,
  emptyMessage = 'No campaigns yet.',
}: GivingTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'createdAt', desc: true }])
  const [filter, setFilter] = useState('')

  const columns = useMemo((): ColumnDef<GivingTableRow>[] => {
    const totalsColumns: ColumnDef<GivingTableRow>[] = showTotals
      ? [
          columnHelper.display({
            id: 'approved',
            header: 'Approved',
            cell: ({ row }) => (
              <span className="font-semibold tabular-nums">
                {row.original.stats != null
                  ? formatAmount(row.original.stats.totalApprovedAmount)
                  : '—'}
              </span>
            ),
          }),
          columnHelper.display({
            id: 'subGivings',
            header: 'Sub givings',
            cell: ({ row }) => (
              <span className="tabular-nums text-muted-foreground">
                {row.original.stats?.subGivingCount ?? '—'}
              </span>
            ),
          }),
        ]
      : []

    return [
      columnHelper.accessor('title', {
        id: 'title',
        header: ({ column }) => <SortHeader column={column} label="Campaign" />,
        cell: ({ row }) => (
          <div className="min-w-0">
            <Link
              to={`/givings/${row.original.id}`}
              className="font-medium text-foreground hover:text-primary hover:underline"
            >
              {row.original.title}
            </Link>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {givingTypeLabel(row.original.givingType)} · {row.original.periodLabel}
            </p>
          </div>
        ),
      }),
      columnHelper.accessor('scopeKind', {
        id: 'scopeKind',
        header: 'Scope',
        cell: ({ getValue }) => <ScopeKindBadge scopeKind={getValue()} />,
      }),
      ...totalsColumns,
      columnHelper.accessor('status', {
        id: 'status',
        header: 'Status',
        cell: ({ getValue }) => <ProgramStatusBadge status={getValue()} />,
      }),
      columnHelper.display({
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <Button type="button" variant="ghost" size="sm" className="h-8 px-2" asChild>
            <Link to={`/givings/${row.original.id}`}>
              Open
              <ArrowRight className="ml-1 size-3.5" />
            </Link>
          </Button>
        ),
      }),
    ] as ColumnDef<GivingTableRow>[]
  }, [showTotals])

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
      const p = row.original
      return (
        p.title.toLowerCase().includes(q) ||
        p.periodLabel.toLowerCase().includes(q) ||
        givingTypeLabel(p.givingType).toLowerCase().includes(q) ||
        scopeKindLabel(p.scopeKind).toLowerCase().includes(q)
      )
    },
  })

  return (
    <section className="overflow-hidden rounded-xl border border-border/60 bg-background">
      <div className="flex flex-col gap-3 border-b border-border/60 px-5 py-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">Campaigns</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {rows.length} open campaign{rows.length === 1 ? '' : 's'} — select one to manage sub
            givings and log contributions
          </p>
        </div>
        <Input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search campaigns…"
          className="h-9 max-w-xs"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-border/60 bg-muted/20">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-muted-foreground">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-border/40 transition-colors last:border-0 hover:bg-muted/20"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 align-middle">
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

function SortHeader({
  column,
  label,
}: {
  column: {
    getToggleSortingHandler: () => ((e: unknown) => void) | undefined
    getIsSorted: () => false | 'asc' | 'desc'
  }
  label: string
}) {
  return (
    <button
      type="button"
      className={cn('inline-flex items-center gap-1 hover:text-foreground')}
      onClick={column.getToggleSortingHandler()}
    >
      {label}
      <ArrowUpDown className="size-3.5 opacity-50" />
    </button>
  )
}
