import { useEffect, useMemo, useState } from 'react'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  type OnChangeFn,
  type SortingState,
} from '@tanstack/react-table'
import { ArrowUpDown, Coins, ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  formatAmount,
  type Contribution,
  type ContributionListQuery,
  type ContributionStatus,
} from '@/api/giving'
import { formatGivingDate } from '@/lib/giving-ui'
import { ContributionStatusBadge } from '@/components/giving/giving-badges'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { InlineSpinner } from '@/components/ui/spinner'
import { TablePagination } from '@/components/ui/table-pagination'
import { useListMemberContributionsQuery } from '@/store/givingApi'
import { cn } from '@/lib/utils'

const columnHelper = createColumnHelper<Contribution>()

function sortFieldFromColumn(columnId: string): ContributionListQuery['sortBy'] {
  switch (columnId) {
    case 'dateSent':
      return 'dateSent'
    case 'programTitle':
      return 'programTitle'
    case 'amount':
      return 'amount'
    case 'status':
      return 'status'
    default:
      return 'dateSent'
  }
}

export function MemberGivingTab({ memberId }: { memberId: string }) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [sorting, setSorting] = useState<SortingState>([{ id: 'dateSent', desc: true }])
  const [status, setStatus] = useState<ContributionStatus | ''>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [searchQuery])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, status, pageSize, sorting, memberId])

  const sortBy = sortFieldFromColumn(sorting[0]?.id ?? 'dateSent')
  const sortDir: 'asc' | 'desc' = sorting[0]?.desc ? 'desc' : 'asc'

  const query: ContributionListQuery = {
    page,
    pageSize,
    sortBy,
    sortDir,
    status: status || undefined,
    search: debouncedSearch || undefined,
  }

  const { data, isFetching, isError } = useListMemberContributionsQuery({
    memberId,
    query,
  })

  const rows = data?.contributions ?? []
  const summary = data?.summary
  const totalCount = data?.totalCount ?? 0

  const handleSortingChange: OnChangeFn<SortingState> = (updater) => {
    setSorting((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      return next.length > 0 ? next : [{ id: 'dateSent', desc: true }]
    })
  }

  const columns = useMemo(
    () => [
      columnHelper.accessor('dateSent', {
        id: 'dateSent',
        header: ({ column }) => <SortHeader column={column} label="Date" />,
        cell: ({ getValue }) => (
          <span className="whitespace-nowrap text-muted-foreground">
            {formatGivingDate(getValue())}
          </span>
        ),
      }),
      columnHelper.accessor('programTitle', {
        id: 'programTitle',
        header: ({ column }) => <SortHeader column={column} label="Campaign" />,
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="font-medium text-foreground">{row.original.programTitle}</p>
            {row.original.programPeriodLabel ? (
              <p className="text-xs text-muted-foreground">{row.original.programPeriodLabel}</p>
            ) : null}
            {row.original.notes ? (
              <p className="mt-1 text-xs text-muted-foreground">{row.original.notes}</p>
            ) : null}
            {row.original.rejectedReason ? (
              <p className="mt-1 text-xs text-destructive">{row.original.rejectedReason}</p>
            ) : null}
          </div>
        ),
      }),
      columnHelper.accessor('amount', {
        id: 'amount',
        header: ({ column }) => <SortHeader column={column} label="Amount" align="right" />,
        cell: ({ row }) => (
          <span className="block text-right font-medium tabular-nums whitespace-nowrap">
            {formatAmount(row.original.amount, row.original.currency)}
          </span>
        ),
      }),
      columnHelper.accessor('status', {
        id: 'status',
        header: ({ column }) => <SortHeader column={column} label="Status" />,
        cell: ({ getValue }) => <ContributionStatusBadge status={getValue()} />,
      }),
      columnHelper.display({
        id: 'actions',
        enableSorting: false,
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <Button type="button" variant="ghost" size="sm" className="h-8 px-2" asChild>
            <Link to={`/givings/${row.original.programId}`}>
              View
              <ExternalLink className="size-3.5" />
            </Link>
          </Button>
        ),
      }),
    ],
    [],
  )

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: handleSortingChange,
    manualSorting: true,
    manualPagination: true,
    getCoreRowModel: getCoreRowModel(),
    pageCount: Math.max(1, Math.ceil(totalCount / pageSize)),
  })

  if (isError) {
    return <p className="text-sm text-destructive">Could not load giving history</p>
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border/60 bg-muted/10 px-4 py-3">
        <p className="text-eyebrow text-muted-foreground">Approved total</p>
        <p className="mt-1 text-xl font-semibold tabular-nums">
          {formatAmount(summary?.approvedTotalAmount ?? 0)}
        </p>
      </div>

      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search campaign or notes…"
          className="h-9 w-full max-w-xs"
          aria-label="Search contributions"
        />
        <select
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          value={status}
          onChange={(e) => setStatus(e.target.value as ContributionStatus | '')}
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          <option value="PendingApproval">Pending approval</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
        </select>
        {isFetching ? <InlineSpinner className="text-muted-foreground" /> : null}
      </div>

      {!isFetching && rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/10 px-6 py-12 text-center">
          <Coins className="size-8 text-muted-foreground/70" />
          <p className="mt-4 text-sm font-medium">No contributions yet</p>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            {debouncedSearch || status
              ? 'No contributions match your filters.'
              : 'Giving contributions logged by cell leaders will appear here once submitted.'}
          </p>
        </div>
      ) : (
        <div className="w-full min-w-0 max-w-full overflow-hidden rounded-xl border border-border/60">
          <div className="w-full max-w-full overflow-x-auto overscroll-x-contain">
            <table className="w-full min-w-[36rem] text-sm" data-testid="member-givings-table">
              <thead>
                {table.getHeaderGroups().map((hg) => (
                  <tr key={hg.id} className="border-b border-border/60 bg-muted/20 text-left">
                    {hg.headers.map((header) => (
                      <th
                        key={header.id}
                        className={cn(
                          'px-4 py-2.5 font-medium text-muted-foreground',
                          header.column.id === 'amount' && 'text-right',
                        )}
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
                {table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="border-b border-border/40 last:border-0">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3 align-middle">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <TablePagination
            page={data?.page ?? page}
            pageSize={data?.pageSize ?? pageSize}
            totalCount={totalCount}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            disabled={isFetching}
          />
        </div>
      )}
    </div>
  )
}

function SortHeader({
  column,
  label,
  align = 'left',
}: {
  column: {
    getToggleSortingHandler: () => ((e: unknown) => void) | undefined
  }
  label: string
  align?: 'left' | 'right'
}) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center gap-1 hover:text-foreground',
        align === 'right' && 'ml-auto',
      )}
      onClick={column.getToggleSortingHandler()}
    >
      {label}
      <ArrowUpDown className="size-3.5 opacity-50" />
    </button>
  )
}
