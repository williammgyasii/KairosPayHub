import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowUpDown, Eye } from 'lucide-react'
import type { ApiClient } from '@/api/client'
import type {
  Contribution,
  ContributionListQuery,
  ContributionStatus,
  GivingProgram,
} from '@/api/giving'
import { formatAmount, listAllContributions } from '@/api/giving'
import type { StructureTree } from '@/api/structure'
import { enrichContribution } from '@/lib/contribution-structure'
import {
  contributionEntererLabel,
  formatGivingDate,
  formatGivingDateTime,
} from '@/lib/giving-ui'
import { ContributionDetailModal } from '@/components/giving/contribution-detail-modal'
import {
  ContributionStatusBadge,
  LegacyParentContributionBadge,
} from '@/components/giving/giving-badges'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TablePagination } from '@/components/ui/table-pagination'
import { InlineSpinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'

type SortColumn = NonNullable<ContributionListQuery['sortBy']>

const SORT_COLUMNS: { id: SortColumn; label: string }[] = [
  { id: 'memberName', label: 'Member' },
  { id: 'programTitle', label: 'Campaign' },
  { id: 'amount', label: 'Amount' },
  { id: 'dateSent', label: 'Date sent' },
  { id: 'status', label: 'Status' },
  { id: 'createdAt', label: 'Submitted' },
  { id: 'approvedAt', label: 'Approved' },
]

const STATUS_OPTIONS: { value: '' | ContributionStatus; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'Approved', label: 'Approved' },
  { value: 'PendingApproval', label: 'Pending' },
  { value: 'Rejected', label: 'Rejected' },
]

const excelCell =
  'border border-border/80 px-2 py-1.5 align-middle text-xs whitespace-nowrap'
const excelHead =
  'border border-border/80 bg-muted/50 px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap'

interface GivingTransactionsLedgerProps {
  api: ApiClient
  campaigns: GivingProgram[]
  tree: StructureTree | null
  viewerRole?: string
}

export function GivingTransactionsLedger({
  api,
  campaigns,
  tree,
  viewerRole,
}: GivingTransactionsLedgerProps) {
  const [rows, setRows] = useState<Contribution[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [campaignId, setCampaignId] = useState('')
  const [status, setStatus] = useState<'' | ContributionStatus>('')
  const [sorting, setSorting] = useState<{ id: SortColumn; desc: boolean }>({
    id: 'createdAt',
    desc: true,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewTarget, setViewTarget] = useState<Contribution | null>(null)

  const rootCampaigns = useMemo(
    () => campaigns.filter((row) => !row.parentProgramId),
    [campaigns],
  )

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, campaignId, status, pageSize, sorting])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await listAllContributions(api, {
        page,
        pageSize,
        sortBy: sorting.id,
        sortDir: sorting.desc ? 'desc' : 'asc',
        search: debouncedSearch || undefined,
        status: status || undefined,
        programId: campaignId || undefined,
      })
      setRows(res.contributions)
      setTotalCount(res.totalCount)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load transactions')
      setRows([])
      setTotalCount(0)
    } finally {
      setLoading(false)
    }
  }, [api, page, pageSize, sorting, debouncedSearch, status, campaignId])

  useEffect(() => {
    void load()
  }, [load])

  function toggleSort(columnId: SortColumn) {
    setSorting((prev) => {
      if (prev.id === columnId) {
        return { id: columnId, desc: !prev.desc }
      }
      return {
        id: columnId,
        desc: columnId === 'amount' || columnId === 'createdAt' || columnId === 'approvedAt',
      }
    })
  }

  const enrichedRows = useMemo(
    () => rows.map((row) => enrichContribution(tree, row)),
    [rows, tree],
  )

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search member, campaign, or notes…"
          className="max-w-sm"
        />
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={campaignId}
          onChange={(e) => setCampaignId(e.target.value)}
        >
          <option value="">All campaigns</option>
          {rootCampaigns.map((campaign) => (
            <option key={campaign.id} value={campaign.id}>
              {campaign.title} · {campaign.periodLabel}
            </option>
          ))}
        </select>
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={status}
          onChange={(e) => setStatus(e.target.value as '' | ContributionStatus)}
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.label} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-border/60">
        {error && <p className="border-b border-border/60 px-4 py-3 text-sm text-destructive">{error}</p>}

        <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] border-collapse text-sm">
              <thead className="sticky top-0 z-10">
                <tr>
                  {SORT_COLUMNS.map((column) => (
                    <th key={column.id} className={excelHead}>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 hover:text-foreground"
                        onClick={() => toggleSort(column.id)}
                      >
                        {column.label}
                        <ArrowUpDown className="size-3" />
                      </button>
                    </th>
                  ))}
                  <th className={excelHead}>Structure</th>
                  <th className={excelHead}>Logged by</th>
                  <th className={excelHead}>Notes</th>
                  <th className={cn(excelHead, 'text-right')}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && rows.length === 0 ? (
                  <tr>
                    <td colSpan={SORT_COLUMNS.length + 4} className="px-4 py-10 text-center">
                      <InlineSpinner className="mx-auto size-6 text-muted-foreground" />
                    </td>
                  </tr>
                ) : enrichedRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={SORT_COLUMNS.length + 4}
                      className="px-4 py-10 text-center text-sm text-muted-foreground"
                    >
                      No givings match your filters.
                    </td>
                  </tr>
                ) : (
                  enrichedRows.map((row, index) => (
                    <tr
                      key={row.id}
                      className={cn(index % 2 === 0 ? 'bg-background' : 'bg-muted/20')}
                    >
                      <td className={cn(excelCell, 'font-medium')}>{row.memberName}</td>
                      <td className={excelCell}>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span>
                            {row.programTitle}
                            {row.programPeriodLabel ? ` · ${row.programPeriodLabel}` : ''}
                          </span>
                          {row.isLegacyParentContribution && <LegacyParentContributionBadge />}
                        </div>
                      </td>
                      <td className={cn(excelCell, 'tabular-nums font-semibold')}>
                        {formatAmount(row.amount, row.currency)}
                      </td>
                      <td className={cn(excelCell, 'text-muted-foreground')}>
                        {formatGivingDate(row.dateSent)}
                      </td>
                      <td className={excelCell}>
                        <ContributionStatusBadge
                          status={row.status}
                          viewerRole={viewerRole}
                          pendingApproverRole={row.pendingApproverRole}
                        />
                      </td>
                      <td className={cn(excelCell, 'text-muted-foreground')}>
                        {formatGivingDateTime(row.createdAt)}
                      </td>
                      <td className={cn(excelCell, 'text-muted-foreground')}>
                        {row.approvedAt ? formatGivingDateTime(row.approvedAt) : '—'}
                      </td>
                      <td className={cn(excelCell, 'max-w-[220px] truncate text-muted-foreground')}>
                        {row.structurePath}
                      </td>
                      <td className={cn(excelCell, 'text-muted-foreground')}>
                        {contributionEntererLabel(row)}
                      </td>
                      <td className={cn(excelCell, 'max-w-[180px] truncate text-muted-foreground')}>
                        {row.notes ?? '—'}
                      </td>
                      <td className={cn(excelCell, 'text-right')}>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs"
                          onClick={() => setViewTarget(row)}
                        >
                          <Eye className="size-3.5" />
                          View
                        </Button>
                      </td>
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

      <ContributionDetailModal
        open={viewTarget !== null}
        onOpenChange={(open) => {
          if (!open) setViewTarget(null)
        }}
        contribution={viewTarget}
        viewerRole={viewerRole}
      />
    </div>
  )
}
