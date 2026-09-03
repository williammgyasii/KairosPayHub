import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowUpDown, ListTree, MoreHorizontal } from 'lucide-react'
import type { ApiClient } from '@/api/core'
import type { GivingProgram, MemberGivingTotal, MemberGivingTotalsQuery } from '@/api/giving'
import { formatAmount, listMemberGivingTotals } from '@/api/giving'
import type { StructureTree } from '@/api/structure'
import { nodeById, parentChain } from '@/lib/structure-tree'
import { formatGivingDate } from '@/lib/giving-ui'
import { MemberGivingBreakdownModal } from '@/components/giving/member-giving-breakdown-modal'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { TablePagination } from '@/components/ui/table-pagination'
import { InlineSpinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'
import type { MemberGivingTotalsSummary } from '@/api/giving'

type SortColumn = NonNullable<MemberGivingTotalsQuery['sortBy']>

const SORT_COLUMNS: { id: SortColumn; label: string }[] = [
  { id: 'memberName', label: 'Member' },
  { id: 'approvedTotal', label: 'Approved total' },
  { id: 'approvedCount', label: 'Payments' },
  { id: 'lastDateSent', label: 'Last given' },
]

const cellClass =
  'border border-border/80 px-3 py-2.5 align-middle text-sm whitespace-nowrap'
const headClass =
  'border border-border/80 bg-muted/50 px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap'

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
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [campaignId, setCampaignId] = useState('')
  const [sorting, setSorting] = useState<{ id: SortColumn; desc: boolean }>({
    id: 'approvedTotal',
    desc: true,
  })
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

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, campaignId, pageSize, sorting])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await listMemberGivingTotals(api, {
        page,
        pageSize,
        sortBy: sorting.id,
        sortDir: sorting.desc ? 'desc' : 'asc',
        search: debouncedSearch || undefined,
        programId: campaignId || undefined,
      })
      setRows(res.members)
      setTotalCount(res.totalCount)
      onSummaryChange?.(res.summary)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load member totals')
      setRows([])
      setTotalCount(0)
    } finally {
      setLoading(false)
    }
  }, [api, page, pageSize, sorting, debouncedSearch, campaignId, onSummaryChange])

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
        desc: columnId === 'approvedTotal' || columnId === 'approvedCount',
      }
    })
  }

  function structurePath(memberParentNodeId: string) {
    if (!tree) return '—'
    const node = nodeById(tree, memberParentNodeId)
    if (!node) return '—'
    return parentChain(tree, node.id)
      .map((item) => item.name)
      .join(' · ')
  }

  return (
    <>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search member…"
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
          {selectedCampaign && (
            <p className="text-sm text-muted-foreground">
              Approved totals include every sub-giving under {selectedCampaign.title}.
            </p>
          )}
        </div>

        <div className="overflow-hidden rounded-xl border border-border/60">
          {error && <p className="border-b border-border/60 px-4 py-3 text-sm text-destructive">{error}</p>}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] border-collapse">
              <thead>
                <tr>
                  <th className={cn(headClass, 'w-16 text-center')}>Rank</th>
                  {SORT_COLUMNS.map((column) => (
                    <th key={column.id} className={headClass}>
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
                  <th className={headClass}>Structure</th>
                  <th className={cn(headClass, 'w-12 text-center')} aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {loading && rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center">
                      <InlineSpinner className="mx-auto size-6 text-muted-foreground" />
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">
                      No approved member giving totals match your filters.
                    </td>
                  </tr>
                ) : (
                  rows.map((row, index) => (
                    <tr
                      key={row.memberId}
                      className={cn(index % 2 === 0 ? 'bg-background' : 'bg-muted/20')}
                    >
                      <td className={cn(cellClass, 'text-center font-semibold tabular-nums')}>
                        {row.rank > 0 ? row.rank : '—'}
                      </td>
                      <td className={cn(cellClass, 'font-medium')}>{row.memberName}</td>
                      <td className={cn(cellClass, 'tabular-nums font-semibold')}>
                        {formatAmount(row.approvedTotal)}
                      </td>
                      <td className={cn(cellClass, 'tabular-nums')}>{row.approvedCount}</td>
                      <td className={cn(cellClass, 'text-muted-foreground')}>
                        {row.lastDateSent ? formatGivingDate(row.lastDateSent) : '—'}
                      </td>
                      <td className={cn(cellClass, 'max-w-[260px] truncate text-muted-foreground')}>
                        {structurePath(row.memberParentNodeId)}
                      </td>
                      <td className={cn(cellClass, 'text-center')}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-8 text-muted-foreground hover:text-foreground"
                              aria-label={`Actions for ${row.memberName}`}
                            >
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem
                              className="gap-2"
                              onClick={() => setBreakdownMember(row)}
                            >
                              <ListTree className="size-4" />
                              View breakdown
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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
