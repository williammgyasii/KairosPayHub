import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
} from '@tanstack/react-table'
import { ArrowUpDown, Columns3, ListTree, X } from 'lucide-react'
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
import { Input } from '@/components/ui/input'
import { TablePagination } from '@/components/ui/table-pagination'
import { InlineSpinner } from '@/components/ui/spinner'
import {
  applyMemberFilterRules,
  getActiveFilterRules,
  type MemberFilterField,
  type MemberFilterRule,
} from '@/lib/member-filters'
import { formatGivingDate } from '@/lib/giving-ui'
import {
  OVERALL_GIVINGS_FILTER_FETCH_CAP,
  OVERALL_GIVINGS_STICKY_MEMBER_WIDTH,
  OVERALL_GIVINGS_STICKY_RANK_WIDTH,
  OVERALL_GIVINGS_STICKY_TOTAL_WIDTH,
  amountFilterOperatorLabel,
  amountForCampaign,
  applyOverallAmountFilters,
  buildOverallGivingsStructureColumns,
  collectCampaignColumns,
  createOverallAmountFilterRule,
  defaultOverallGivingsColumnVisibility,
  getActiveOverallAmountFilters,
  loadOverallGivingsColumnVisibility,
  memberGivingMatchesVisibleSearch,
  memberGivingToFilterRow,
  persistOverallGivingsColumnVisibility,
  stickyColumnIdsForTier,
  stickyColumnLeft,
  stickyColumnWidth,
  stickyTierForWidth,
  structureLayersForFilters,
  structureUnitForLayer,
  type OverallAmountFilterOperator,
  type OverallAmountFilterRule,
  type OverallGivingsStickyTier,
  type MemberGivingsScopeMode,
} from '@/lib/overall-givings-table'
import { cn } from '@/lib/utils'

type SortColumn = NonNullable<MemberGivingTotalsQuery['sortBy']>

function useOverallGivingsStickyTier(): OverallGivingsStickyTier {
  const [tier, setTier] = useState<OverallGivingsStickyTier>(() =>
    typeof window === 'undefined' ? 'full' : stickyTierForWidth(window.innerWidth),
  )

  useEffect(() => {
    function sync() {
      setTier(stickyTierForWidth(window.innerWidth))
    }
    sync()
    window.addEventListener('resize', sync)
    return () => window.removeEventListener('resize', sync)
  }, [])

  return tier
}

const cellClass =
  'border border-border px-3 py-2.5 align-middle text-sm whitespace-nowrap'
const headClass =
  'border border-border bg-muted px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap'

const columnHelper = createColumnHelper<MemberGivingTotal>()

interface MemberGivingRankingsTableProps {
  api: ApiClient
  campaigns: GivingProgram[]
  tree: StructureTree | null
  viewerRole?: string
  onSummaryChange?: (summary: MemberGivingTotalsSummary) => void
  /** When set with scopeMode=campaign, locks rankings to this program tree. */
  programId?: string
  scopeMode?: MemberGivingsScopeMode
}

export function MemberGivingRankingsTable({
  api,
  campaigns,
  tree,
  viewerRole,
  onSummaryChange,
  programId: lockedProgramId,
  scopeMode = 'church',
}: MemberGivingRankingsTableProps) {
  const stickyTier = useOverallGivingsStickyTier()
  const isCampaignScope = scopeMode === 'campaign' && Boolean(lockedProgramId)
  const structureColumns = useMemo(() => buildOverallGivingsStructureColumns(tree), [tree])
  const structureLayers = useMemo(() => structureLayersForFilters(tree), [tree])

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [searchField, setSearchField] = useState<MemberFilterField | 'all'>('all')
  const [campaignId, setCampaignId] = useState(lockedProgramId ?? '')
  const [filterRules, setFilterRules] = useState<MemberFilterRule[]>([])
  const [amountRules, setAmountRules] = useState<OverallAmountFilterRule[]>([])
  const [sorting, setSorting] = useState<SortingState>([{ id: 'lastDateSent', desc: true }])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [fetchedRows, setFetchedRows] = useState<MemberGivingTotal[]>([])
  const [serverTotalCount, setServerTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [breakdownMember, setBreakdownMember] = useState<MemberGivingTotal | null>(null)

  useEffect(() => {
    if (isCampaignScope && lockedProgramId) {
      setCampaignId(lockedProgramId)
    }
  }, [isCampaignScope, lockedProgramId])

  const rootCampaigns = useMemo(
    () => campaigns.filter((row) => !row.parentProgramId),
    [campaigns],
  )

  const selectedCampaign = useMemo(
    () => rootCampaigns.find((row) => row.id === campaignId) ?? null,
    [rootCampaigns, campaignId],
  )

  const scopedCampaignLabel = useMemo(() => {
    if (!isCampaignScope || !lockedProgramId) return null
    return campaigns.find((row) => row.id === lockedProgramId)?.title ?? 'This campaign'
  }, [isCampaignScope, lockedProgramId, campaigns])

  const campaignColumns = useMemo(() => collectCampaignColumns(fetchedRows), [fetchedRows])

  const activeFilters = useMemo(() => getActiveFilterRules(filterRules), [filterRules])
  const activeAmountFilters = useMemo(
    () => getActiveOverallAmountFilters(amountRules),
    [amountRules],
  )
  const filtersActive = activeFilters.length > 0
  const needsLargeFetch =
    filtersActive || activeAmountFilters.length > 0 || debouncedSearch.length > 0

  const visibleColumnIds = useMemo(() => {
    const merged = {
      ...defaultOverallGivingsColumnVisibility(structureColumns, campaignColumns),
      ...columnVisibility,
    }
    return Object.entries(merged)
      .filter(([, visible]) => visible !== false)
      .map(([id]) => id)
  }, [columnVisibility, structureColumns, campaignColumns])

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, campaignId, pageSize, sorting, filtersActive, activeAmountFilters.length])

  useEffect(() => {
    const storage = typeof localStorage !== 'undefined' ? localStorage : null
    setColumnVisibility((prev) => ({
      ...loadOverallGivingsColumnVisibility(structureColumns, campaignColumns, storage, scopeMode),
      ...prev,
    }))
  }, [structureColumns, campaignColumns, scopeMode])

  useEffect(() => {
    const storage = typeof localStorage !== 'undefined' ? localStorage : null
    persistOverallGivingsColumnVisibility(
      columnVisibility as Record<string, boolean>,
      storage,
      scopeMode,
    )
  }, [columnVisibility, scopeMode])

  const sortBy = (sorting[0]?.id as SortColumn | undefined) ?? 'lastDateSent'
  const sortDir = sorting[0]?.desc === false ? 'asc' : 'desc'

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const fetchPageSize = needsLargeFetch ? OVERALL_GIVINGS_FILTER_FETCH_CAP : pageSize
      const fetchPage = needsLargeFetch ? 1 : page
      const res = await listMemberGivingTotals(api, {
        page: fetchPage,
        pageSize: fetchPageSize,
        sortBy,
        sortDir,
        programId: campaignId || undefined,
      })
      setFetchedRows(res.members)
      setServerTotalCount(res.totalCount)
      onSummaryChange?.(res.summary)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load member totals')
      setFetchedRows([])
      setServerTotalCount(0)
    } finally {
      setLoading(false)
    }
  }, [api, page, pageSize, sortBy, sortDir, campaignId, needsLargeFetch, onSummaryChange])

  useEffect(() => {
    void load()
  }, [load])

  const filteredRows = useMemo(() => {
    let members = fetchedRows
    if (filtersActive) {
      const filterRows = members.map((row) => memberGivingToFilterRow(row, tree))
      const matchedIds = new Set(applyMemberFilterRules(filterRows, filterRules).map((r) => r.id))
      members = members.filter((row) => matchedIds.has(row.memberId))
    }
    if (activeAmountFilters.length > 0) {
      members = applyOverallAmountFilters(members, amountRules)
    }
    if (debouncedSearch) {
      members = members.filter((row) =>
        memberGivingMatchesVisibleSearch(
          row,
          debouncedSearch,
          tree,
          visibleColumnIds,
          structureColumns,
          campaignColumns,
        ),
      )
    }
    return members
  }, [
    fetchedRows,
    filtersActive,
    filterRules,
    activeAmountFilters.length,
    amountRules,
    debouncedSearch,
    tree,
    visibleColumnIds,
    structureColumns,
    campaignColumns,
  ])

  const rows = useMemo(() => {
    if (!needsLargeFetch) return fetchedRows
    const start = (page - 1) * pageSize
    return filteredRows.slice(start, start + pageSize)
  }, [needsLargeFetch, fetchedRows, filteredRows, page, pageSize])

  const totalCount = needsLargeFetch ? filteredRows.length : serverTotalCount

  const filterPreviewRows = useMemo(
    () => rows.map((row) => memberGivingToFilterRow(row, tree)),
    [rows, tree],
  )

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

  const columns = useMemo(() => {
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

    const campaignDefs: ColumnDef<MemberGivingTotal, unknown>[] = campaignColumns.map(
      (column) =>
        columnHelper.display({
          id: column.id,
          header: () => (
            <span
              className={cn(
                'inline-flex max-w-[140px] flex-col gap-0.5',
                column.isSubCampaign ? 'text-amber-800 dark:text-amber-200' : 'text-sky-800 dark:text-sky-200',
              )}
              title={column.title}
            >
              <span className="truncate">{column.title}</span>
              <span className="text-[10px] font-medium normal-case tracking-normal opacity-70">
                {column.isSubCampaign ? 'Sub' : 'Main'}
              </span>
            </span>
          ),
          cell: ({ row }) => {
            const amount = amountForCampaign(row.original, column.programId)
            if (amount == null) {
              return <span className="text-muted-foreground/50">—</span>
            }
            return (
              <span
                className={cn(
                  'font-semibold tabular-nums',
                  column.isSubCampaign
                    ? 'text-amber-800 dark:text-amber-200'
                    : 'text-sky-800 dark:text-sky-200',
                )}
              >
                {formatAmount(amount)}
              </span>
            )
          },
        }),
    )

    return [
      columnHelper.accessor('rank', {
        id: 'rank',
        header: 'Rank',
        size: OVERALL_GIVINGS_STICKY_RANK_WIDTH,
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
        size: OVERALL_GIVINGS_STICKY_MEMBER_WIDTH,
        cell: ({ getValue }) => <span className="font-medium text-foreground">{getValue()}</span>,
      }),
      columnHelper.accessor('approvedTotal', {
        id: 'approvedTotal',
        header: ({ column }) => <SortHeader label="Approved total" columnId={column.id} />,
        size: OVERALL_GIVINGS_STICKY_TOTAL_WIDTH,
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
      ...campaignDefs,
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
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="relative z-[30] size-8 text-muted-foreground hover:text-foreground"
            aria-label={`View breakdown for ${row.original.memberName}`}
            onClick={(event) => {
              event.stopPropagation()
              setBreakdownMember(row.original)
            }}
          >
            <ListTree className="size-4" />
          </Button>
        ),
      }),
    ] as unknown as ColumnDef<MemberGivingTotal, unknown>[]
  }, [structureColumns, campaignColumns, tree])

  const table = useReactTable({
    data: rows,
    columns,
    state: {
      sorting,
      columnVisibility,
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    manualPagination: true,
  })

  const visibleColumnCount = table.getVisibleLeafColumns().length
  const toggleableColumns = table
    .getAllLeafColumns()
    .filter((column) => column.id !== 'actions')

  function stickyClasses(columnId: string, kind: 'th' | 'td', rowTone?: 'even' | 'odd') {
    const left = stickyColumnLeft(columnId, stickyTier)
    if (left == null) return 'relative z-0'
    const stickyIds = stickyColumnIdsForTier(stickyTier)
    const isLastSticky = columnId === stickyIds[stickyIds.length - 1]
    return cn(
      // Opaque fill + clip so horizontally scrolled cells cannot show through.
      'sticky overflow-hidden border-border bg-clip-padding',
      kind === 'th' && 'z-[45] !bg-muted',
      kind === 'td' && 'z-[35]',
      kind === 'td' && (rowTone === 'odd' ? '!bg-muted' : '!bg-card'),
      kind === 'td' &&
        (rowTone === 'odd'
          ? 'group-hover:!bg-sky-100 dark:group-hover:!bg-sky-950'
          : 'group-hover:!bg-sky-50 dark:group-hover:!bg-sky-950'),
      // Solid divider + soft shadow seals the sticky edge against bleed.
      isLastSticky &&
        'border-r-2 border-r-border shadow-[6px_0_10px_-6px_rgba(15,23,42,0.35)] dark:shadow-[6px_0_10px_-6px_rgba(0,0,0,0.65)]',
    )
  }

  function stickyStyle(columnId: string): CSSProperties | undefined {
    const left = stickyColumnLeft(columnId, stickyTier)
    const width = stickyColumnWidth(columnId, stickyTier)
    if (left == null || width == null) return undefined
    return {
      left,
      minWidth: width,
      width,
      backgroundClip: 'padding-box',
    }
  }

  const amountFilterSlot =
    amountRules.length > 0 ? (
      <div className="space-y-2">
        {amountRules.map((rule, index) => (
          <div key={rule.id} className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'inline-flex h-8 items-center rounded-md px-2.5 text-xs font-semibold uppercase tracking-wide',
                filterRules.length === 0 && index === 0
                  ? 'bg-primary/10 text-primary'
                  : 'bg-muted text-muted-foreground',
              )}
            >
              {filterRules.length === 0 && index === 0 ? 'Where' : 'And'}
            </span>
            <select
              className="h-8 min-w-[10rem] rounded-md border border-input bg-background px-2 text-sm"
              value={rule.scope}
              onChange={(e) =>
                setAmountRules((prev) =>
                  prev.map((item) =>
                    item.id === rule.id
                      ? { ...item, scope: e.target.value as OverallAmountFilterRule['scope'] }
                      : item,
                  ),
                )
              }
            >
              <option value="approvedTotal">Approved total</option>
              {campaignColumns.map((column) => (
                <option key={column.id} value={column.id}>
                  {column.title}
                </option>
              ))}
            </select>
            <select
              className="h-8 rounded-md border border-input bg-background px-2 text-sm"
              value={rule.operator}
              onChange={(e) =>
                setAmountRules((prev) =>
                  prev.map((item) =>
                    item.id === rule.id
                      ? {
                          ...item,
                          operator: e.target.value as OverallAmountFilterOperator,
                        }
                      : item,
                  ),
                )
              }
            >
              {(['lt', 'lte', 'eq', 'gte', 'gt'] as OverallAmountFilterOperator[]).map(
                (operator) => (
                  <option key={operator} value={operator}>
                    {amountFilterOperatorLabel(operator)}
                  </option>
                ),
              )}
            </select>
            <Input
              type="number"
              min={0}
              step="0.01"
              className="h-8 w-28"
              placeholder="Amount"
              value={rule.value}
              onChange={(e) =>
                setAmountRules((prev) =>
                  prev.map((item) =>
                    item.id === rule.id ? { ...item, value: e.target.value } : item,
                  ),
                )
              }
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground"
              aria-label="Remove amount filter"
              onClick={() =>
                setAmountRules((prev) => prev.filter((item) => item.id !== rule.id))
              }
            >
              <X className="size-3.5" />
            </Button>
          </div>
        ))}
      </div>
    ) : null

  return (
    <>
      <div className="min-w-0 max-w-full space-y-3">
        <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
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
            totalCount={needsLargeFetch ? filteredRows.length : serverTotalCount}
            compact
            hideSearchField
            searchPlaceholder="Search visible columns…"
            leadingSlot={
              isCampaignScope ? (
                <div className="flex h-9 max-w-full items-center rounded-md border border-input bg-muted/40 px-3 text-sm font-medium sm:max-w-xs">
                  <span className="truncate">{scopedCampaignLabel}</span>
                </div>
              ) : (
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
              )
            }
            trailingSlot={
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="outline" size="sm" className="h-9 gap-1.5">
                    <Columns3 className="size-3.5" />
                    Columns
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="z-[60] max-h-80 w-64 overflow-y-auto">
                  <DropdownMenuLabel>Show columns</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {toggleableColumns.map((column) => {
                    const campaignMeta = campaignColumns.find((item) => item.id === column.id)
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
                                    : column.id === 'rank'
                                      ? 'Rank'
                                      : campaignMeta?.title ??
                                        structureColumns.find((item) => item.id === column.id)
                                          ?.label ??
                                        column.id
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
                        <span className="min-w-0 truncate">{label}</span>
                        <span
                          className={cn(
                            'inline-flex h-5 w-9 shrink-0 items-center rounded-full px-0.5 transition-colors',
                            visible ? 'bg-emerald-500/80' : 'bg-muted',
                          )}
                          aria-hidden
                        >
                          <span
                            className={cn(
                              'size-4 rounded-full bg-white transition-transform',
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
            extraFilterSlot={amountFilterSlot}
            extraActiveFilterCount={activeAmountFilters.length}
            onAddExtraFilter={() =>
              setAmountRules((prev) => [...prev, createOverallAmountFilterRule('approvedTotal')])
            }
            onClearExtraFilters={() => setAmountRules([])}
            addFilterLabel="Add structure filter"
          />
          {isCampaignScope && scopedCampaignLabel ? (
            <p className="border-t border-border/50 bg-sky-500/5 px-3 py-2 text-xs text-sky-900/80 dark:text-sky-100/80">
              Member totals for {scopedCampaignLabel} including sub-campaigns. Amount columns are
              programs in this campaign tree.
            </p>
          ) : selectedCampaign ? (
            <p className="border-t border-border/50 bg-sky-500/5 px-3 py-2 text-xs text-sky-900/80 dark:text-sky-100/80">
              Totals include every sub-giving under {selectedCampaign.title}. Campaign columns show
              amounts per program like a spreadsheet.
            </p>
          ) : null}
        </div>

        <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
          {error && <p className="border-b border-border/60 px-4 py-3 text-sm text-destructive">{error}</p>}

          <div
            className={cn(
              'isolate max-h-[min(70vh,720px)] overflow-auto',
              loading && rows.length > 0 && 'pointer-events-none',
            )}
          >
            <table className="w-max min-w-full border-separate border-spacing-0">
              <thead className="sticky top-0 z-40">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        className={cn(
                          headClass,
                          stickyClasses(header.column.id, 'th'),
                          header.column.id === 'rank' && 'text-center',
                          header.column.id === 'actions' && 'w-12 text-center',
                        )}
                        style={stickyStyle(header.column.id)}
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
                    <tr
                      key={row.id}
                      className={cn(
                        'group transition-colors hover:bg-sky-50 dark:hover:bg-sky-950',
                        index % 2 === 0 ? 'bg-card' : 'bg-muted',
                      )}
                    >
                      {row.getVisibleCells().map((cell) => {
                        const isSticky = stickyColumnLeft(cell.column.id, stickyTier) != null
                        const rowTone = index % 2 === 0 ? 'even' : 'odd'
                        return (
                        <td
                          key={cell.id}
                          className={cn(
                            cellClass,
                            stickyClasses(cell.column.id, 'td', rowTone),
                            !isSticky && (rowTone === 'even' ? 'bg-card' : 'bg-muted'),
                            cell.column.id === 'rank' && 'text-center',
                            cell.column.id === 'actions' && 'relative z-[30] text-center',
                          )}
                          style={stickyStyle(cell.column.id)}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                        )
                      })}
                    </tr>
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
