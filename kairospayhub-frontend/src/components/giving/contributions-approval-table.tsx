import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowUpDown, Check, Eye, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { SortingState } from '@tanstack/react-table'
import type { ApiClient } from '@/api/client'
import type { Contribution, ContributionListQuery, GivingProgram } from '@/api/giving'
import { formatAmount, listProgramContributions } from '@/api/giving'
import { ContributionDetailModal } from '@/components/giving/contribution-detail-modal'
import { RejectContributionModal } from '@/components/giving/reject-contribution-modal'
import { ProgramApprovalBadge, LegacyParentContributionBadge } from '@/components/giving/giving-badges'
import {
  contributionEntererLabel,
  contributionSubGivingLabel,
  formatGivingDate,
  formatGivingDateTime,
  programCreatorLabel,
} from '@/lib/giving-ui'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { TablePagination } from '@/components/ui/table-pagination'
import { InlineSpinner } from '@/components/ui/spinner'

type TableMode = 'pending' | 'approved'

interface ContributionsApprovalTableProps {
  api: ApiClient
  parentProgram: GivingProgram
  childPrograms?: GivingProgram[]
  mode: TableMode
  viewerRole?: string
  canAct?: boolean
  canApproveSubGivings?: boolean
  busy?: boolean
  onApprove: (contributionId: string, contributionProgramId: string) => Promise<void>
  onReject: (contributionId: string, contributionProgramId: string, reason: string | null) => Promise<void>
  onApproveSubGiving?: (programId: string) => Promise<void>
  onRejectSubGiving?: (programId: string, reason: string | null) => Promise<void>
  onSummaryChange?: () => void
}

const SORT_MAP: Record<string, ContributionListQuery['sortBy']> = {
  memberName: 'memberName',
  amount: 'amount',
  dateSent: 'dateSent',
  createdAt: 'createdAt',
  status: 'status',
  approvedAt: 'approvedAt',
}

function matchesSearch(text: string, query: string) {
  return text.toLowerCase().includes(query.toLowerCase())
}

export function ContributionsApprovalTable({
  api,
  parentProgram,
  childPrograms = [],
  mode,
  viewerRole,
  canAct = false,
  canApproveSubGivings = false,
  busy,
  onApprove,
  onReject,
  onApproveSubGiving,
  onRejectSubGiving,
  onSummaryChange,
}: ContributionsApprovalTableProps) {
  const [rows, setRows] = useState<Contribution[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [summaryTotal, setSummaryTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [sorting, setSorting] = useState<SortingState>([
    { id: mode === 'approved' ? 'approvedAt' : 'createdAt', desc: true },
  ])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewTarget, setViewTarget] = useState<Contribution | null>(null)
  const [rejectTarget, setRejectTarget] = useState<Contribution | null>(null)
  const [rejectSubGivingTarget, setRejectSubGivingTarget] = useState<GivingProgram | null>(null)

  const pendingSubGivings = useMemo(
    () =>
      mode === 'pending' && canApproveSubGivings
        ? childPrograms.filter((row) => row.approvalStatus === 'PendingPastorApproval')
        : [],
    [mode, canApproveSubGivings, childPrograms],
  )

  const filteredSubGivings = useMemo(() => {
    if (!debouncedSearch) return pendingSubGivings
    return pendingSubGivings.filter((row) => {
      const haystack = [row.title, row.periodLabel, programCreatorLabel(row)].join(' ')
      return matchesSearch(haystack, debouncedSearch)
    })
  }, [pendingSubGivings, debouncedSearch])

  const showSubGivingColumn =
    parentProgram.hasChildren ||
    childPrograms.length > 0 ||
    rows.some((row) => row.isSubGiving) ||
    rows.some((row) => row.isLegacyParentContribution) ||
    filteredSubGivings.length > 0

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, mode, pageSize])

  const sortBy = SORT_MAP[sorting[0]?.id ?? 'createdAt'] ?? 'createdAt'
  const sortDir = sorting[0]?.desc ? 'desc' : 'asc'

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await listProgramContributions(api, parentProgram.id, {
        page,
        pageSize,
        sortBy,
        sortDir,
        search: debouncedSearch || undefined,
        status: mode === 'pending' ? 'PendingApproval' : 'Approved',
        awaitingMyApproval: mode === 'pending',
      })
      setRows(res.contributions)
      setTotalCount(res.totalCount)
      setSummaryTotal(
        mode === 'pending' ? res.summary.pendingTotalAmount : res.summary.approvedTotalAmount,
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load contributions')
      setRows([])
      setTotalCount(0)
    } finally {
      setLoading(false)
    }
  }, [api, parentProgram.id, page, pageSize, sortBy, sortDir, debouncedSearch, mode])

  useEffect(() => {
    void load()
  }, [load])

  function toggleSort(columnId: string) {
    setSorting((prev) => {
      const current = prev[0]
      if (current?.id === columnId) {
        return [{ id: columnId, desc: !current.desc }]
      }
      return [{ id: columnId, desc: true }]
    })
    setPage(1)
  }

  async function handleApprove(contributionId: string, contributionProgramId: string) {
    await onApprove(contributionId, contributionProgramId)
    setViewTarget(null)
    await load()
    onSummaryChange?.()
  }

  async function handleReject(
    contributionId: string,
    contributionProgramId: string,
    reason: string | null,
  ) {
    await onReject(contributionId, contributionProgramId, reason)
    setRejectTarget(null)
    setViewTarget(null)
    await load()
    onSummaryChange?.()
  }

  async function handleApproveSubGiving(programId: string) {
    if (!onApproveSubGiving) return
    await onApproveSubGiving(programId)
    await load()
    onSummaryChange?.()
  }

  async function handleRejectSubGiving(programId: string, reason: string | null) {
    if (!onRejectSubGiving) return
    await onRejectSubGiving(programId, reason)
    setRejectSubGivingTarget(null)
    await load()
    onSummaryChange?.()
  }

  const title = mode === 'pending' ? 'Pending approval' : 'Approved giving'
  const description =
    mode === 'pending'
      ? 'Review sub-givings and member submissions awaiting your decision.'
      : 'Audit trail of approved amounts — includes contributions logged on sub-givings.'

  const columns = useMemo(() => {
    const base = [
      ...(showSubGivingColumn ? [{ id: 'subGiving', label: 'Sub giving' }] : []),
      { id: 'memberName', label: 'Member' },
      { id: 'amount', label: 'Amount' },
      { id: 'dateSent', label: 'Date sent' },
    ]
    if (mode === 'approved') {
      return [
        ...base,
        { id: 'approvedAt', label: 'Approved' },
        { id: 'approvedByName', label: 'Approved by' },
      ]
    }
    return [...base, { id: 'createdAt', label: 'Submitted' }, { id: 'enteredBy', label: 'Logged by' }]
  }, [mode, showSubGivingColumn])

  const colSpan = columns.length + 1
  const showSubGivingsOnPage = page === 1 && filteredSubGivings.length > 0

  return (
    <>
      <Card className={mode === 'pending' ? 'border-amber-200/50 bg-amber-500/[0.03]' : undefined}>
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
            <div className="rounded-lg border border-border/60 bg-background px-3 py-2 text-sm">
              <span className="text-muted-foreground">Total </span>
              <span className="font-semibold tabular-nums">{formatAmount(summaryTotal)}</span>
            </div>
          </div>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search member, sub-giving, or notes…"
            className="max-w-sm"
          />
        </CardHeader>
        <CardContent className="p-0">
          {error && <p className="px-5 pb-3 text-sm text-destructive">{error}</p>}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-y border-border/60 bg-muted/20">
                  {columns.map((column) => (
                    <th key={column.id} className="px-4 py-3 text-left">
                      {column.id === 'enteredBy' ||
                      column.id === 'approvedByName' ||
                      column.id === 'subGiving' ? (
                        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {column.label}
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground"
                          onClick={() => toggleSort(column.id)}
                        >
                          {column.label}
                          <ArrowUpDown className="size-3.5" />
                        </button>
                      )}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading && page === 1 && !showSubGivingsOnPage ? (
                  <tr>
                    <td colSpan={colSpan} className="px-4 py-10 text-center">
                      <InlineSpinner className="mx-auto size-6 text-muted-foreground" />
                    </td>
                  </tr>
                ) : (
                  <>
                    {showSubGivingsOnPage &&
                      filteredSubGivings.map((subGiving) => (
                        <tr
                          key={`sub-${subGiving.id}`}
                          className="border-b border-border/40 bg-amber-500/[0.04] hover:bg-amber-500/[0.07]"
                        >
                          {showSubGivingColumn && (
                            <td className="px-4 py-3">
                              <div className="space-y-1">
                                <p className="font-medium">{subGiving.title}</p>
                                <p className="text-xs text-muted-foreground">
                                  {subGiving.periodLabel}
                                </p>
                                <Badge
                                  variant="outline"
                                  className="border-amber-300/60 bg-amber-500/10 text-[10px] uppercase tracking-wide text-amber-900"
                                >
                                  Sub-giving
                                </Badge>
                              </div>
                            </td>
                          )}
                          <td className="px-4 py-3 text-muted-foreground">
                            {programCreatorLabel(subGiving)}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">—</td>
                          <td className="px-4 py-3 text-muted-foreground">—</td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {formatGivingDateTime(subGiving.createdAt)}
                          </td>
                          <td className="px-4 py-3">
                            <ProgramApprovalBadge status={subGiving.approvalStatus} />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-2">
                              <Button type="button" size="sm" variant="outline" asChild>
                                <Link to={`/givings/${subGiving.id}`}>
                                  <Eye className="size-3.5" />
                                  View
                                </Link>
                              </Button>
                              {canApproveSubGivings && (
                                <>
                                  <Button
                                    type="button"
                                    size="sm"
                                    disabled={busy}
                                    onClick={() => void handleApproveSubGiving(subGiving.id)}
                                  >
                                    <Check className="size-3.5" />
                                    Approve
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    disabled={busy}
                                    onClick={() => setRejectSubGivingTarget(subGiving)}
                                  >
                                    <X className="size-3.5" />
                                    Reject
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}

                    {loading && rows.length === 0 ? (
                      <tr>
                        <td colSpan={colSpan} className="px-4 py-10 text-center">
                          <InlineSpinner className="mx-auto size-6 text-muted-foreground" />
                        </td>
                      </tr>
                    ) : rows.length === 0 && !showSubGivingsOnPage ? (
                      <tr>
                        <td colSpan={colSpan} className="px-4 py-10 text-center text-muted-foreground">
                          No {mode === 'pending' ? 'pending' : 'approved'} contributions found.
                        </td>
                      </tr>
                    ) : (
                      rows.map((row) => (
                        <tr key={row.id} className="border-b border-border/40 hover:bg-muted/10">
                          {showSubGivingColumn && (
                            <td className="px-4 py-3">
                              {row.isLegacyParentContribution ? (
                                <LegacyParentContributionBadge />
                              ) : row.isSubGiving ? (
                                <div className="space-y-1">
                                  <p className="font-medium text-foreground">
                                    {contributionSubGivingLabel(row)}
                                  </p>
                                  <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                                    Sub-giving
                                  </Badge>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                          )}
                          <td className="px-4 py-3 font-medium">{row.memberName}</td>
                          <td className="px-4 py-3 tabular-nums">
                            {formatAmount(row.amount, row.currency)}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {formatGivingDate(row.dateSent)}
                          </td>
                          {mode === 'approved' ? (
                            <>
                              <td className="px-4 py-3 text-muted-foreground">
                                {formatGivingDateTime(row.approvedAt)}
                              </td>
                              <td className="px-4 py-3 text-muted-foreground">
                                {row.approvedByName ?? '—'}
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="px-4 py-3 text-muted-foreground">
                                {formatGivingDateTime(row.createdAt)}
                              </td>
                              <td className="px-4 py-3 text-muted-foreground">
                                {contributionEntererLabel(row)}
                              </td>
                            </>
                          )}
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => setViewTarget(row)}
                              >
                                <Eye className="size-3.5" />
                                View
                              </Button>
                              {mode === 'pending' && canAct && (
                                <>
                                  <Button
                                    type="button"
                                    size="sm"
                                    disabled={busy}
                                    onClick={() => void handleApprove(row.id, row.programId)}
                                  >
                                    <Check className="size-3.5" />
                                    Approve
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    disabled={busy}
                                    onClick={() => setRejectTarget(row)}
                                  >
                                    <X className="size-3.5" />
                                    Reject
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </>
                )}
              </tbody>
            </table>
          </div>
          <TablePagination
            page={page}
            pageSize={pageSize}
            totalCount={totalCount}
            disabled={loading || busy}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </CardContent>
      </Card>

      <ContributionDetailModal
        open={viewTarget !== null}
        onOpenChange={(open) => !open && setViewTarget(null)}
        contribution={viewTarget}
        viewerRole={viewerRole}
        canAct={mode === 'pending' && canAct}
        busy={busy}
        onApprove={
          viewTarget ? () => void handleApprove(viewTarget.id, viewTarget.programId) : undefined
        }
        onReject={viewTarget ? () => setRejectTarget(viewTarget) : undefined}
      />

      <RejectContributionModal
        open={rejectTarget !== null}
        onOpenChange={(open) => !open && setRejectTarget(null)}
        memberName={rejectTarget?.memberName ?? 'Member'}
        busy={busy}
        onConfirm={(reason) => {
          if (!rejectTarget) return
          void handleReject(rejectTarget.id, rejectTarget.programId, reason)
        }}
      />

      <RejectContributionModal
        open={rejectSubGivingTarget !== null}
        onOpenChange={(open) => !open && setRejectSubGivingTarget(null)}
        memberName={rejectSubGivingTarget?.title ?? 'Sub-giving'}
        busy={busy}
        onConfirm={(reason) => {
          if (!rejectSubGivingTarget) return
          void handleRejectSubGiving(rejectSubGivingTarget.id, reason)
        }}
      />
    </>
  )
}
