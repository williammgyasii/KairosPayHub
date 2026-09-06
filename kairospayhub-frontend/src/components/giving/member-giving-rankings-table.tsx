import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  useReactTable,
  type ColumnDef,
  type ExpandedState,
  type SortingState,
  type VisibilityState,
} from '@tanstack/react-table'
import {
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
  Columns3,
  ListTree,
  MoreHorizontal,
} from 'lucide-react'
import type { ApiClient } from '@/api/core'
import type {
  GivingProgram,
  MemberGivingTotal,
  MemberGivingTotalsQuery,
  MemberGivingTotalsSummary,
} from '@/api/giving'
import { formatAmount, listMemberGivingTotals } from '@/api/giving'
import type { StructureTree } from '@/api/structure'
import { MemberGivingBreakdownModal } from '@/components/giving/member-giving-breakdown-modal'
import { MemberTableToolbar } from '@/components/structure/member-table-toolbar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { TablePagination } from '@/components/ui/table-pagination'
import { InlineSpinner } from '@/components/ui/spinner'
import { applyMemberFilterRules, getActiveFilterRules, type MemberFilterField, type MemberFilterRule } from '@/lib/member-filters'
import { formatGivingDate } from '@/lib/giving-ui'
import {
  OVERALL_GIVINGS_FILTER_FETCH_CAP,
  buildOverallGivingsStructureColumns,
  defaultOverallGivingsColumnVisibility,
  loadOverallGivingsColumnVisibility,
  memberGivingMatchesVisibleSearch,
  memberGivingToFilterRow,
  persistOverallGivingsColumnVisibility,
  structureLayersForFilters,
  structureUnitForLayer,
  truncateCampaignChips,
} from '@/lib/overall-givings-table'
import { cn } from '@/lib/utils'

type SortColumn = NonNullable<MemberGivingTotalsQuery['sortBy']>

const cellClass =
  'border border-border/80 px-3 py-2.5 align-middle text-sm whitespace-nowrap'
const headClass =
  'border border-border/80 bg-muted/50 px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap'

const columnHelper = createColumnHelper<MemberGivingTotal>()

interface MemberGivingRankingsTableProps {
  api: ApiClient
  campaigns: GivingProgram[]
  tree: StructureTree | null
  viewerRole?: string
  onSummaryChange?: (summary: MemberGivingTotalsSummary) => void
}

export function MemberGivingRankingsTable({
  api,
  campaigns,
  tree,
  viewerRole,
  onSummaryChange,
}: MemberGivingRankingsTableProps) {
  const structureColumns = useMemo(() => buildOverallGivingsStructureColumns(tree), [tree])
  const structureLayers = useMemo(() => structureLayersForFilters(tree), [tree])

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [searchField, setSearchField] = useState<MemberFilterField | 'all'>('all')
  const [campaignId, setCampaignId] = useState('')
  const [filterRules, setFilterRules] = useState<MemberFilterRule[]>([])
  const [sorting, setSorting] = useState<SortingState>([{ id: 'lastDateSent', desc: true }])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(() =>
    loadOverallGivingsColumnVisibility(structureColumns),
  )
  const [expanded, setExpanded] = useState<ExpandedState>({})
  const [rows, setRows] = useState<MemberGivingTotal[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [breakdownMember, setBreakdownMember] = useState<MemberGivingTotal | null>(null)

  const rootCampaigns = useMemo(
    () => campaigns.filter((row) => !row.parentProgramId),
    [campaigns],
  )

  const selectedCampaign = useMemo(
    () => rootCampaigns.find((row) => row.id === campaignId) ?? null,
    [rootCampaigns, campaignId],
  )

  const activeFilters = useMemo(() => getActiveFilterRules(filterRules), [filterRules])
  const filtersActive = activeFilters.length > 0
  const clientRefineActive = filtersActive || debouncedSearch.length > 0

  const visibleColumnIds = useMemo(() => {
    const merged = {
      ...defaultOverallGivingsColumnVisibility(structureColumns),
      ...columnVisibility,
    }
    return Object.entries(merged)
      .filter(([, visible]) => visible !== false)
      .map(([id]) => id)
  }, [columnVisibility, structureColumns])

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, campaignId, pageSize, sorting, filtersActive, visibleColumnIds])

  useEffect(() => {
    setColumnVisibility((prev) => {
      const next = {
        ...loadOverallGivingsColumnVisibility(structureColumns),
        ...prev,
      }
      for (const column of structureColumns) {
        if (next[column.id] === undefined) next[column.id] = true
      }
      return next
    })
  }, [structureColumns])

  useEffect(() => {
    persistOverallGivingsColumnVisibility(columnVisibility as Record<string, boolean>)
  }, [columnVisibility])

  const sortBy = (sorting[0]?.id as SortColumn | undefined) ?? 'lastDateSent'
  const sortDir = sorting[0]?.desc === false ? 'asc' : 'desc'

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const fetchPageSize = clientRefineActive ? OVERALL_GIVINGS_FILTER_FETCH_CAP : pageSize
      const fetchPage = clientRefineActive ? 1 : page
      const res = await listMemberGivingTotals(api, {
        page: fetchPage,
        pageSize: fetchPageSize,
        sortBy,
        sortDir,
        programId: campaignId || undefined,
      })

      let members = res.members
      if (filtersActive) {
        const filterRows = members.map((row) => memberGivingToFilterRow(row, tree))
        const matchedIds = new Set(applyMemberFilterRules(filterRows, filterRules).map((r) => r.id))
        members = members.filter((row) => matchedIds.has(row.memberId))
      }
      if (debouncedSearch) {
        members = members.filter((row) =>
          memberGivingMatchesVisibleSearch(
            row,
            debouncedSearch,
            tree,
            visibleColumnIds,
            structureColumns,
          ),
        )
      }

      if (clientRefineActive) {
        const start = (page - 1) * pageSize
        setTotalCount(members.length)
        setRows(members.slice(start, start + pageSize))
      } else {
        setRows(members)
        setTotalCount(res.totalCount)
      }
      onSummaryChange?.(res.summary)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load member totals')
      setRows([])
      setTotalCount(0)
    } finally {
      setLoading(false)
    }
  }, [
    api,
    page,
    pageSize,
    sortBy,
    sortDir,
    debouncedSearch,
    campaignId,
    clientRefineActive,
    filtersActive,
    filterRules,
    tree,
    visibleColumnIds,
    structureColumns,
    onSummaryChange,
  ])

  useEffect(() => {
    void load()
  }, [load])

  const filterPreviewRows = useMemo(
    () => rows.map((row) => memberGivingToFilterRow(row, tree)),
    [rows, tree],
  )

  const columns = useMemo((): ColumnDef<MemberGivingTotal, unknown>[] => {
    const structureDefs: ColumnDef<MemberGivingTotal, unknown>[] = structureColumns.map(
      (column) =>
        columnHelper.display({
          id: column.id,
          header: column.label,
          cell: ({ row }) => (
            <span className="rounded-md bg-muted/60 px-1.5 py-0.5 text-muted-foreground">
              {structureUnitForLayer(tree, row.original.memberParentNodeId, column.layerId)}
            </span>
          ),
        }),
    )

    return [
      columnHelper.display({
        id: 'expand',
        header: () => <span className="sr-only">Expand</span>,
        cell: ({ row }) => {
          const canExpand = row.original.campaigns.length > 0
          if (!canExpand) return null
          return (
            <button
              type="button"
              className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label={row.getIsExpanded() ? 'Collapse campaigns' : 'Expand campaigns'}
              onClick={row.getToggleExpandedHandler()}
            >
              {row.getIsExpanded() ? (
                <ChevronDown className="size-4" />
              ) : (
                <ChevronRight className="size-4" />
              )}
            </button>
          )
        },
      }),
      columnHelper.accessor('rank', {
        id: 'rank',
        header: 'Rank',
        cell: ({ getValue }) => {
          const rank = getValue()
          if (!(rank > 0)) return <span className="text-muted-foreground">—</span>
          return (
            <span
              className={cn(
                'inline-flex min-w-7 items-center justify-center rounded-md px-1.5 py-0.5 text-xs font-bold tabular-nums',
                rank === 1 && 'bg-amber-500/20 text-amber-800 dark:text-amber-200',
                rank === 2 && 'bg-slate-400/25 text-slate-700 dark:text-slate-200',
                rank === 3 && 'bg-orange-500/20 text-orange-800 dark:text-orange-200',
                rank > 3 && 'bg-sky-500/10 text-sky-800 dark:text-sky-200',
              )}
            >
              {rank}
            </span>
          )
        },
      }),
      columnHelper.accessor('memberName', {
        id: 'memberName',
        header: ({ column }) => <SortHeader label="Member" columnId={column.id} />,
        cell: ({ getValue }) => <span className="font-medium text-foreground">{getValue()}</span>,
      }),
      columnHelper.accessor('approvedTotal', {
        id: 'approvedTotal',
        header: ({ column }) => <SortHeader label="Approved total" columnId={column.id} />,
        cell: ({ getValue }) => (
          <span className="font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
            {formatAmount(getValue())}
          </span>
        ),
      }),
      columnHelper.accessor('approvedCount', {
        id: 'approvedCount',
        header: ({ column }) => <SortHeader label="Payments" columnId={column.id} />,
        cell: ({ getValue }) => (
          <span className="inline-flex rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-xs font-medium tabular-nums text-emerald-800 dark:text-emerald-200">
            {getValue()}
          </span>
        ),
      }),
      columnHelper.display({
        id: 'campaigns',
        header: 'Campaigns',
        cell: ({ row }) => {
          const list = row.original.campaigns
          const { visible, overflow } = truncateCampaignChips(list)
          return (
            <div className="flex max-w-[280px] flex-wrap items-center gap-1.5">
              <span className="inline-flex min-w-6 items-center justify-center rounded-md bg-sky-500/15 px-1.5 py-0.5 text-xs font-semibold tabular-nums text-sky-800 dark:text-sky-200">
                {list.length}
              </span>
              {visible.map((campaign) => (
                <span
                  key={campaign.programId}
                  className={cn(
                    'inline-flex max-w-[110px] truncate rounded-md px-1.5 py-0.5 text-[11px] font-medium',
                    campaign.parentProgramId
                      ? 'bg-amber-500/15 text-amber-900 dark:text-amber-100'
                      : 'bg-sky-500/15 text-sky-900 dark:text-sky-100',
                  )}
                  title={campaign.title}
                >
                  {campaign.title}
                </span>
              ))}
              {overflow > 0 ? (
                <span className="text-[11px] font-medium text-sky-700/80 dark:text-sky-300/80">
                  +{overflow}
                </span>
              ) : null}
            </div>
          )
        },
      }),
      columnHelper.accessor('lastDateSent', {
        id: 'lastDateSent',
        header: ({ column }) => <SortHeader label="Last given" columnId={column.id} />,
        cell: ({ getValue }) => {
          const value = getValue()
          return (
            <span className="tabular-nums text-muted-foreground">
              {value ? formatGivingDate(value) : '—'}
            </span>
          )
        },
      }),
      columnHelper.accessor('pendingCount', {
        id: 'pendingCount',
        header: 'Pending',
        cell: ({ getValue }) => {
          const count = getValue()
          if (!count) return <span className="tabular-nums text-muted-foreground">0</span>
          return (
            <span className="inline-flex rounded-md bg-amber-500/15 px-1.5 py-0.5 text-xs font-semibold tabular-nums text-amber-900 dark:text-amber-100">
              {count}
            </span>
          )
        },
      }),
      columnHelper.accessor('pendingTotal', {
        id: 'pendingTotal',
        header: 'Pending total',
        cell: ({ getValue }) => (
          <span className="tabular-nums text-amber-800 dark:text-amber-200">
            {formatAmount(getValue())}
          </span>
        ),
      }),
      ...structureDefs,
      columnHelper.display({
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground hover:text-foreground"
                aria-label={`Actions for ${row.original.memberName}`}
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem className="gap-2" onClick={() => setBreakdownMember(row.original)}>
                <ListTree className="size-4" />
                View breakdown
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      }),
    ]
  }, [structureColumns, tree])

  function SortHeader({ label, columnId }: { label: string; columnId: string }) {
    return (
      <button
        type="button"
        className="inline-flex items-center gap-1 hover:text-foreground"
        onClick={() => {
          setSorting((prev) => {
            const current = prev[0]
            if (current?.id === columnId) {
              return [{ id: columnId, desc: !current.desc }]
            }
            return [
              {
                id: columnId,
                desc:
                  columnId === 'approvedTotal' ||
                  columnId === 'approvedCount' ||
                  columnId === 'lastDateSent',
              },
            ]
          })
        }}
      >
        {label}
        <ArrowUpDown className="size-3" />
      </button>
    )
  }

  const table = useReactTable({
    data: rows,
    columns,
    state: {
      sorting,
      columnVisibility,
      expanded,
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onExpandedChange: setExpanded,
    getRowCanExpand: (row) => row.original.campaigns.length > 0,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    manualSorting: true,
    manualPagination: true,
  })

  const visibleColumnCount = table.getVisibleLeafColumns().length

  const toggleableColumns = table
    .getAllLeafColumns()
    .filter((column) => column.id !== 'expand' && column.id !== 'actions')

  return (
    <>
      <div className="space-y-3">
        <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
          <MemberTableToolbar
            className="border-b-0"
            rows={filterPreviewRows}
            structureLayers={structureLayers}
            rules={filterRules}
            onChangeRules={setFilterRules}
            searchQuery={search}
            onSearchQueryChange={setSearch}
            searchField={searchField}
            onSearchFieldChange={setSearchField}
            filteredCount={totalCount}
            totalCount={totalCount}
            compact
            hideSearchField
            searchPlaceholder="Search visible columns…"
            leadingSlot={
              <select
                className="h-9 w-full shrink-0 rounded-md border border-input bg-background px-3 text-sm sm:w-48"
                value={campaignId}
                onChange={(e) => setCampaignId(e.target.value)}
                aria-label="Campaign scope"
              >
                <option value="">All campaigns</option>
                {rootCampaigns.map((campaign) => (
                  <option key={campaign.id} value={campaign.id}>
                    {campaign.title} · {campaign.periodLabel}
                  </option>
                ))}
              </select>
            }
            trailingSlot={
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="outline" size="sm" className="h-9 gap-1.5">
                    <Columns3 className="size-3.5" />
                    Columns
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Show columns</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {toggleableColumns.map((column) => {
                    const label =
                      typeof column.columnDef.header === 'string'
                        ? column.columnDef.header
                        : column.id === 'memberName'
                          ? 'Member'
                          : column.id === 'approvedTotal'
                            ? 'Approved total'
                            : column.id === 'approvedCount'
                              ? 'Payments'
                              : column.id === 'lastDateSent'
                                ? 'Last given'
                                : column.id === 'pendingCount'
                                  ? 'Pending'
                                  : column.id === 'pendingTotal'
                                    ? 'Pending total'
                                    : column.id === 'campaigns'
                                      ? 'Campaigns'
                                      : column.id === 'rank'
                                        ? 'Rank'
                                        : structureColumns.find((item) => item.id === column.id)
                                            ?.label ?? column.id
                    const visible = column.getIsVisible()
                    return (
                      <DropdownMenuItem
                        key={column.id}
                        className="justify-between gap-3"
                        onSelect={(event) => {
                          event.preventDefault()
                          column.toggleVisibility(!visible)
                        }}
                      >
                        <span>{label}</span>
                        <span
                          className={cn(
                            'inline-flex h-5 w-9 items-center rounded-full px-0.5 transition-colors',
                            visible ? 'bg-emerald-500/80' : 'bg-muted',
                          )}
                          aria-hidden
                        >
                          <span
                            className={cn(
                              'size-4 rounded-full bg-white shadow transition-transform',
                              visible ? 'translate-x-4' : 'translate-x-0',
                            )}
                          />
                        </span>
                      </DropdownMenuItem>
                    )
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            }
          />
          {selectedCampaign ? (
            <p className="border-t border-border/50 bg-sky-500/5 px-3 py-2 text-xs text-sky-900/80 dark:text-sky-100/80">
              Totals include every sub-giving under {selectedCampaign.title}.
            </p>
          ) : null}
        </div>

        <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
          {error && <p className="border-b border-border/60 px-4 py-3 text-sm text-destructive">{error}</p>}

          <div className={cn('overflow-x-auto', loading && rows.length > 0 && 'opacity-70')}>
            <table className="w-full min-w-[1100px] border-collapse">
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id} className="bg-gradient-to-b from-muted/80 to-muted/40">
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        className={cn(
                          headClass,
                          'bg-transparent',
                          header.column.id === 'rank' && 'w-16 text-center',
                          header.column.id === 'expand' && 'w-10',
                          header.column.id === 'actions' && 'w-12 text-center',
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
                {loading && rows.length === 0 ? (
                  <tr>
                    <td colSpan={Math.max(visibleColumnCount, 1)} className="px-4 py-10 text-center">
                      <InlineSpinner className="mx-auto size-6 text-muted-foreground" />
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={Math.max(visibleColumnCount, 1)}
                      className="px-4 py-10 text-center text-sm text-muted-foreground"
                    >
                      No approved member giving totals match your filters.
                    </td>
                  </tr>
                ) : (
                  table.getRowModel().rows.map((row, index) => (
                    <Fragment key={row.id}>
                      <tr
                        className={cn(
                          'transition-colors hover:bg-sky-500/5',
                          index % 2 === 0 ? 'bg-background' : 'bg-muted/25',
                          row.getIsExpanded() && 'bg-sky-500/5',
                        )}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <td
                            key={cell.id}
                            className={cn(
                              cellClass,
                              cell.column.id === 'rank' && 'text-center',
                              cell.column.id === 'actions' && 'text-center',
                              cell.column.id === 'campaigns' && 'whitespace-normal',
                            )}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                      {row.getIsExpanded() ? (
                        <tr className="bg-sky-500/8">
                          <td
                            colSpan={Math.max(visibleColumnCount, 1)}
                            className="border border-border/80 px-4 py-3"
                          >
                            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-sky-800/80 dark:text-sky-200/80">
                              Campaigns ({row.original.campaigns.length})
                            </p>
                            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                              {row.original.campaigns.map((campaign) => (
                                <div
                                  key={campaign.programId}
                                  className={cn(
                                    'rounded-lg border px-3 py-2',
                                    campaign.parentProgramId
                                      ? 'border-amber-500/25 bg-amber-500/5'
                                      : 'border-sky-500/25 bg-sky-500/5',
                                  )}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-medium">{campaign.title}</p>
                                      <p className="text-[11px] text-muted-foreground">
                                        {campaign.parentProgramId ? 'Sub-campaign' : 'Main campaign'}
                                        {' · '}
                                        {campaign.approvedCount} payment
                                        {campaign.approvedCount === 1 ? '' : 's'}
                                      </p>
                                    </div>
                                    <span className="shrink-0 text-sm font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
                                      {formatAmount(campaign.approvedAmount)}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <TablePagination
            page={page}
            pageSize={pageSize}
            totalCount={totalCount}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            disabled={loading}
          />
        </div>
      </div>

      <MemberGivingBreakdownModal
        api={api}
        open={Boolean(breakdownMember)}
        onOpenChange={(open) => !open && setBreakdownMember(null)}
        memberId={breakdownMember?.memberId ?? null}
        memberName={breakdownMember?.memberName ?? 'Member'}
        approvedTotal={breakdownMember?.approvedTotal ?? 0}
        rank={breakdownMember?.rank}
        memberParentNodeId={breakdownMember?.memberParentNodeId}
        tree={tree}
        campaignId={campaignId}
        campaigns={campaigns}
        viewerRole={viewerRole}
      />
    </>
  )
}
