import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowUpDown, Check, Eye, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { SortingState } from '@tanstack/react-table'
import type { ApiClient } from '@/api/client'
import type { Contribution, ContributionListQuery, GivingProgram } from '@/api/giving'
import { formatAmount, listAllContributions, listProgramContributions } from '@/api/giving'
import { canManageChurch } from '@/api/me'
import type { StructureTree } from '@/api/structure'
import { memberPfccName, nodePfccName } from '@/lib/contribution-structure'
import {
  groupContributionsForApproval,
  paginateApprovalDisplayRows,
  summarizeBatch,
  type ApprovalDisplayRow,
} from '@/lib/contribution-batches'
import { ContributionBulkBatchModal } from '@/components/giving/contribution-bulk-batch-modal'
import { ContributionDetailModal } from '@/components/giving/contribution-detail-modal'
import { RejectContributionModal } from '@/components/giving/reject-contribution-modal'
import { ProgramApprovalBadge, LegacyParentContributionBadge } from '@/components/giving/giving-badges'
import {
  contributionEntererLabel,
  contributionSubmittedByLabel,
  contributionSubGivingLabel,
  formatGivingDate,
  formatGivingDateTime,
  formatTableDate,
  programCreatorLabel,
  programSubmittedByLabel,
} from '@/lib/giving-ui'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { TablePagination } from '@/components/ui/table-pagination'
import { InlineSpinner } from '@/components/ui/spinner'

type TableMode = 'pending' | 'approved'
type TableScope = 'program' | 'church'

const PENDING_FETCH_SIZE = 100

interface ContributionsApprovalTableProps {
  api: ApiClient
  scope?: TableScope
  tree?: StructureTree | null
  parentProgram?: GivingProgram
  childPrograms?: GivingProgram[]
  pendingSubGivings?: GivingProgram[]
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
  campaign: 'programTitle',
}

function matchesSearch(text: string, query: string) {
  return text.toLowerCase().includes(query.toLowerCase())
}

export function ContributionsApprovalTable({
  api,
  scope = 'program',
  tree = null,
  parentProgram,
  childPrograms = [],
  pendingSubGivings = [],
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
  const isChurchScope = scope === 'church'
  const usePastorPendingColumns = mode === 'pending' && canManageChurch(viewerRole ?? '')
  const [rows, setRows] = useState<Contribution[]>([])
  const [displayRows, setDisplayRows] = useState<ApprovalDisplayRow[]>([])
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
  const [batchTarget, setBatchTarget] = useState<Contribution[] | null>(null)
  const [rejectTarget, setRejectTarget] = useState<Contribution | null>(null)
  const [rejectBatchTarget, setRejectBatchTarget] = useState<Contribution[] | null>(null)
  const [rejectSubGivingTarget, setRejectSubGivingTarget] = useState<GivingProgram | null>(null)
  const [pendingAction, setPendingAction] = useState<'approve' | 'reject' | null>(null)

  const pendingSubGivingRows = useMemo(
    () =>
      mode === 'pending' && canApproveSubGivings
        ? isChurchScope
          ? pendingSubGivings
          : childPrograms.filter((row) => row.approvalStatus === 'PendingPastorApproval')
        : [],
    [mode, canApproveSubGivings, isChurchScope, pendingSubGivings, childPrograms],
  )

  const filteredSubGivings = useMemo(() => {
    if (!debouncedSearch) return pendingSubGivingRows
    return pendingSubGivingRows.filter((row) => {
      const haystack = [row.title, row.periodLabel, programCreatorLabel(row)].join(' ')
      return matchesSearch(haystack, debouncedSearch)
    })
  }, [pendingSubGivingRows, debouncedSearch])

  const showSubGivingColumn =
    isChurchScope ||
    parentProgram?.hasChildren ||
    childPrograms.length > 0 ||
    rows.some((row) => row.isSubGiving) ||
    rows.some((row) => row.isLegacyParentContribution) ||
    displayRows.some(
      (row) => row.kind === 'single' && (row.contribution.isSubGiving || row.contribution.isLegacyParentContribution),
    ) ||
    filteredSubGivings.length > 0

  const visibleDisplayRows = useMemo(() => {
    if (mode !== 'pending') return []
    return paginateApprovalDisplayRows(displayRows, page, pageSize)
  }, [mode, displayRows, page, pageSize])

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, mode, pageSize])

  const sortBy = SORT_MAP[sorting[0]?.id ?? 'createdAt'] ?? 'createdAt'
  const sortDir: ContributionListQuery['sortDir'] = sorting[0]?.desc ? 'desc' : 'asc'

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const baseQuery = {
        sortBy,
        sortDir,
        search: debouncedSearch || undefined,
        status: (mode === 'pending' ? 'PendingApproval' : 'Approved') as ContributionListQuery['status'],
        awaitingMyApproval: mode === 'pending' && canAct,
      }

      if (mode === 'pending') {
        const query = { ...baseQuery, page: 1, pageSize: PENDING_FETCH_SIZE }
        const res = isChurchScope
          ? await listAllContributions(api, query)
          : await listProgramContributions(api, parentProgram!.id, query)

        const batchIds = [
          ...new Set(
            res.contributions
              .map((row) => row.batchId)
              .filter((batchId): batchId is string => Boolean(batchId)),
          ),
        ]
        const batchGroups = new Map<string, Contribution[]>()
        await Promise.all(
          batchIds.map(async (batchId) => {
            const batchRes = isChurchScope
              ? await listAllContributions(api, { ...query, batchId })
              : await listProgramContributions(api, parentProgram!.id, { ...query, batchId })
            batchGroups.set(batchId, batchRes.contributions)
          }),
        )

        const grouped = groupContributionsForApproval(res.contributions, batchGroups)
        setDisplayRows(grouped)
        setRows([])
        setTotalCount(grouped.length)
        setSummaryTotal(res.summary.pendingTotalAmount)
      } else {
        const query = { ...baseQuery, page, pageSize }
        const res = isChurchScope
          ? await listAllContributions(api, query)
          : await listProgramContributions(api, parentProgram!.id, query)
        setRows(res.contributions)
        setDisplayRows([])
        setTotalCount(res.totalCount)
        setSummaryTotal(res.summary.approvedTotalAmount)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load contributions')
      setRows([])
      setDisplayRows([])
      setTotalCount(0)
    } finally {
      setLoading(false)
    }
  }, [
    api,
    isChurchScope,
    parentProgram?.id,
    page,
    pageSize,
    sortBy,
    sortDir,
    debouncedSearch,
    mode,
    canAct,
  ])

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
    setPendingAction('approve')
    try {
      await onApprove(contributionId, contributionProgramId)
      setViewTarget(null)
      await load()
      onSummaryChange?.()
    } finally {
      setPendingAction(null)
    }
  }

  async function handleReject(
    contributionId: string,
    contributionProgramId: string,
    reason: string | null,
  ) {
    setPendingAction('reject')
    try {
      await onReject(contributionId, contributionProgramId, reason)
      setRejectTarget(null)
      setViewTarget(null)
      await load()
      onSummaryChange?.()
    } finally {
      setPendingAction(null)
    }
  }

  async function handleRejectBatch(contributions: Contribution[], reason: string | null) {
    setPendingAction('reject')
    try {
      for (const row of contributions) {
        await onReject(row.id, row.programId, reason)
      }
      setRejectBatchTarget(null)
      setBatchTarget(null)
      await load()
      onSummaryChange?.()
    } finally {
      setPendingAction(null)
    }
  }

  async function handleApproveBatch(contributions: Contribution[]) {
    setPendingAction('approve')
    try {
      for (const row of contributions) {
        await onApprove(row.id, row.programId)
      }
      setBatchTarget(null)
      await load()
      onSummaryChange?.()
    } finally {
      setPendingAction(null)
    }
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
      ? isChurchScope
        ? 'Review member submissions and sub-givings awaiting your decision across all campaigns.'
        : 'Review sub-givings and member submissions awaiting your decision.'
      : isChurchScope
        ? 'Approved amounts across all campaigns in your scope.'
        : 'Audit trail of approved amounts — includes contributions logged on sub-givings.'

  const columns = useMemo(() => {
    const base = [
      ...(isChurchScope ? [{ id: 'campaign', label: 'Campaign' }] : []),
      ...(showSubGivingColumn && !isChurchScope ? [{ id: 'subGiving', label: 'Sub giving' }] : []),
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
    if (usePastorPendingColumns) {
      return [...base, { id: 'submittedBy', label: 'Submitted' }, { id: 'pfcc', label: 'PFCC' }]
    }
    return [...base, { id: 'createdAt', label: 'Submitted' }, { id: 'enteredBy', label: 'Logged by' }]
  }, [mode, showSubGivingColumn, isChurchScope, usePastorPendingColumns])

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
                      column.id === 'subGiving' ||
                      column.id === 'submittedBy' ||
                      column.id === 'pfcc' ? (
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
                          {isChurchScope ? (
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
                          ) : (
                            showSubGivingColumn && (
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
                            )
                          )}
                          <td className="px-4 py-3 text-muted-foreground">
                            {usePastorPendingColumns ? '—' : programCreatorLabel(subGiving)}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">—</td>
                          <td className="px-4 py-3 text-muted-foreground">—</td>
                          {mode === 'approved' ? (
                            <>
                              <td className="px-4 py-3 text-muted-foreground">—</td>
                              <td className="px-4 py-3 text-muted-foreground">—</td>
                            </>
                          ) : usePastorPendingColumns ? (
                            <>
                              <td className="px-4 py-3 text-muted-foreground">
                                {programSubmittedByLabel(subGiving)}
                              </td>
                              <td className="px-4 py-3 text-muted-foreground">
                                {nodePfccName(tree, subGiving.scopeNodeId)}
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="px-4 py-3 text-muted-foreground">
                                {formatGivingDateTime(subGiving.createdAt)}
                              </td>
                              <td className="px-4 py-3">
                                <ProgramApprovalBadge status={subGiving.approvalStatus} />
                              </td>
                            </>
                          )}
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

                    {loading && (mode === 'pending' ? visibleDisplayRows.length === 0 : rows.length === 0) ? (
                      <tr>
                        <td colSpan={colSpan} className="px-4 py-10 text-center">
                          <InlineSpinner className="mx-auto size-6 text-muted-foreground" />
                        </td>
                      </tr>
                    ) : (mode === 'pending' ? visibleDisplayRows.length === 0 : rows.length === 0) &&
                      !showSubGivingsOnPage ? (
                      <tr>
                        <td colSpan={colSpan} className="px-4 py-10 text-center text-muted-foreground">
                          No {mode === 'pending' ? 'pending' : 'approved'} contributions found.
                        </td>
                      </tr>
                    ) : mode === 'pending' ? (
                      visibleDisplayRows.map((entry) =>
                        entry.kind === 'batch' ? (
                          (() => {
                            const summary = summarizeBatch(entry.batchId, entry.contributions)
                            return (
                              <tr
                                key={`batch-${entry.batchId}`}
                                className="border-b border-border/40 bg-sky-500/[0.03] hover:bg-sky-500/[0.06]"
                              >
                                {isChurchScope && (
                                  <td className="px-4 py-3">
                                    <p className="font-medium">{summary.programTitle}</p>
                                    {summary.programPeriodLabel && (
                                      <p className="text-xs text-muted-foreground">
                                        {summary.programPeriodLabel}
                                      </p>
                                    )}
                                    <Badge
                                      variant="outline"
                                      className="mt-1 border-sky-300/60 bg-sky-500/10 text-[10px] uppercase tracking-wide text-sky-900"
                                    >
                                      Bulk batch
                                    </Badge>
                                  </td>
                                )}
                                {showSubGivingColumn && !isChurchScope && (
                                  <td className="px-4 py-3 text-muted-foreground">—</td>
                                )}
                                <td className="px-4 py-3">
                                  <p className="font-medium">Bulk · {summary.memberCount} members</p>
                                </td>
                                <td className="px-4 py-3 tabular-nums font-semibold">
                                  {formatAmount(summary.totalAmount, summary.currency)}
                                </td>
                                <td className="px-4 py-3 text-muted-foreground">
                                  {usePastorPendingColumns
                                    ? formatTableDate(summary.dateSent)
                                    : formatGivingDate(summary.dateSent)}
                                </td>
                                {usePastorPendingColumns ? (
                                  <>
                                    <td className="px-4 py-3 text-muted-foreground">
                                      {contributionSubmittedByLabel(summary)}
                                    </td>
                                    <td className="px-4 py-3 text-muted-foreground">
                                      {memberPfccName(tree, summary.memberParentNodeId)}
                                    </td>
                                  </>
                                ) : (
                                  <>
                                    <td className="px-4 py-3 text-muted-foreground">
                                      {formatGivingDateTime(summary.createdAt)}
                                    </td>
                                    <td className="px-4 py-3 text-muted-foreground">
                                      {contributionSubmittedByLabel(summary)}
                                    </td>
                                  </>
                                )}
                                <td className="px-4 py-3">
                                  <div className="flex items-center justify-end gap-2">
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setBatchTarget(entry.contributions)}
                                    >
                                      <Eye className="size-3.5" />
                                      View
                                    </Button>
                                    {canAct && (
                                      <>
                                        <Button
                                          type="button"
                                          size="sm"
                                          disabled={busy}
                                          onClick={() => void handleApproveBatch(entry.contributions)}
                                        >
                                          <Check className="size-3.5" />
                                          Approve
                                        </Button>
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="outline"
                                          disabled={busy}
                                          onClick={() => setRejectBatchTarget(entry.contributions)}
                                        >
                                          <X className="size-3.5" />
                                          Reject
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )
                          })()
                        ) : (
                          <tr
                            key={entry.contribution.id}
                            className="border-b border-border/40 hover:bg-muted/10"
                          >
                            {isChurchScope && (
                              <td className="px-4 py-3">
                                <p className="font-medium">{entry.contribution.programTitle}</p>
                                {entry.contribution.programPeriodLabel && (
                                  <p className="text-xs text-muted-foreground">
                                    {entry.contribution.programPeriodLabel}
                                  </p>
                                )}
                                {entry.contribution.isSubGiving && (
                                  <Badge variant="outline" className="mt-1 text-[10px] uppercase tracking-wide">
                                    Sub-giving
                                  </Badge>
                                )}
                                {entry.contribution.isLegacyParentContribution && (
                                  <div className="mt-1">
                                    <LegacyParentContributionBadge />
                                  </div>
                                )}
                              </td>
                            )}
                            {showSubGivingColumn && !isChurchScope && (
                              <td className="px-4 py-3">
                                {entry.contribution.isLegacyParentContribution ? (
                                  <LegacyParentContributionBadge />
                                ) : entry.contribution.isSubGiving ? (
                                  <div className="space-y-1">
                                    <p className="font-medium text-foreground">
                                      {contributionSubGivingLabel(entry.contribution)}
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
                            <td className="px-4 py-3 font-medium">{entry.contribution.memberName}</td>
                            <td className="px-4 py-3 tabular-nums">
                              {formatAmount(entry.contribution.amount, entry.contribution.currency)}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {usePastorPendingColumns
                                ? formatTableDate(entry.contribution.dateSent)
                                : formatGivingDate(entry.contribution.dateSent)}
                            </td>
                            {usePastorPendingColumns ? (
                              <>
                                <td className="px-4 py-3 text-muted-foreground">
                                  {contributionSubmittedByLabel(entry.contribution)}
                                </td>
                                <td className="px-4 py-3 text-muted-foreground">
                                  {memberPfccName(tree, entry.contribution.memberParentNodeId)}
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="px-4 py-3 text-muted-foreground">
                                  {formatGivingDateTime(entry.contribution.createdAt)}
                                </td>
                                <td className="px-4 py-3 text-muted-foreground">
                                  {contributionEntererLabel(entry.contribution)}
                                </td>
                              </>
                            )}
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setViewTarget(entry.contribution)}
                                >
                                  <Eye className="size-3.5" />
                                  View
                                </Button>
                                {canAct && (
                                  <>
                                    <Button
                                      type="button"
                                      size="sm"
                                      disabled={busy}
                                      onClick={() =>
                                        void handleApprove(
                                          entry.contribution.id,
                                          entry.contribution.programId,
                                        )
                                      }
                                    >
                                      <Check className="size-3.5" />
                                      Approve
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      disabled={busy}
                                      onClick={() => setRejectTarget(entry.contribution)}
                                    >
                                      <X className="size-3.5" />
                                      Reject
                                    </Button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ),
                      )
                    ) : (
                      rows.map((row) => (
                        <tr key={row.id} className="border-b border-border/40 hover:bg-muted/10">
                          {isChurchScope && (
                            <td className="px-4 py-3">
                              <p className="font-medium">{row.programTitle}</p>
                              {row.programPeriodLabel && (
                                <p className="text-xs text-muted-foreground">{row.programPeriodLabel}</p>
                              )}
                              {row.isSubGiving && (
                                <Badge variant="outline" className="mt-1 text-[10px] uppercase tracking-wide">
                                  Sub-giving
                                </Badge>
                              )}
                              {row.isLegacyParentContribution && (
                                <div className="mt-1">
                                  <LegacyParentContributionBadge />
                                </div>
                              )}
                            </td>
                          )}
                          {showSubGivingColumn && !isChurchScope && (
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
                            {usePastorPendingColumns
                              ? formatTableDate(row.dateSent)
                              : formatGivingDate(row.dateSent)}
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
                          ) : usePastorPendingColumns ? (
                            <>
                              <td className="px-4 py-3 text-muted-foreground">
                                {contributionSubmittedByLabel(row)}
                              </td>
                              <td className="px-4 py-3 text-muted-foreground">
                                {memberPfccName(tree, row.memberParentNodeId)}
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
        pendingAction={pendingAction}
        onApprove={
          viewTarget ? () => void handleApprove(viewTarget.id, viewTarget.programId) : undefined
        }
        onReject={viewTarget ? () => setRejectTarget(viewTarget) : undefined}
      />

      <ContributionBulkBatchModal
        open={batchTarget !== null}
        onOpenChange={(open) => !open && setBatchTarget(null)}
        contributions={batchTarget ?? []}
        tree={tree}
        viewerRole={viewerRole}
        canAct={mode === 'pending' && canAct}
        busy={busy}
        pendingAction={pendingAction}
        onApprove={
          batchTarget ? () => void handleApproveBatch(batchTarget) : undefined
        }
        onReject={batchTarget ? () => setRejectBatchTarget(batchTarget) : undefined}
      />

      <RejectContributionModal
        open={rejectBatchTarget !== null}
        onOpenChange={(open) => !open && setRejectBatchTarget(null)}
        memberName={`Bulk batch · ${rejectBatchTarget?.length ?? 0} members`}
        busy={busy}
        onConfirm={(reason) => {
          if (!rejectBatchTarget) return
          void handleRejectBatch(rejectBatchTarget, reason)
        }}
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
