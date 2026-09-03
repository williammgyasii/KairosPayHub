import { useMemo, useState } from 'react'
import { ArrowRight, Check, Eye, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { ApiClient } from '@/api/core'
import type { GivingProgram } from '@/api/giving'
import { approveSubGiving, formatAmount, rejectSubGiving } from '@/api/giving'
import type { ChurchRole } from '@/api/auth'
import { canManageChurch } from '@/api/auth'
import {
  ProgramApprovalBadge,
  ProgramStatusBadge,
  ScopeKindBadge,
  SubGivingTagBadge,
} from '@/components/giving/giving-badges'
import { programCreatorLabel } from '@/lib/giving-ui'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface SubGivingsPanelProps {
  meRole: ChurchRole | 'Leader'
  children: GivingProgram[]
  api: ApiClient
  onRefresh: () => Promise<void>
  onCreateClick?: () => void
}

function isChurchDefined(row: GivingProgram) {
  return !row.createdByRole || row.createdByRole === 'Pastor' || row.createdByRole === 'ChurchAdmin'
}

function sortSubGivings(rows: GivingProgram[]) {
  return [...rows].sort((a, b) => {
    const pendingA = a.approvalStatus === 'PendingPastorApproval' ? 0 : 1
    const pendingB = b.approvalStatus === 'PendingPastorApproval' ? 0 : 1
    if (pendingA !== pendingB) return pendingA - pendingB
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
}

export function SubGivingsPanel({
  meRole,
  children,
  api,
  onRefresh,
  onCreateClick,
}: SubGivingsPanelProps) {
  const churchManager = canManageChurch(meRole)
  const isScopedLeader = meRole === 'PFCCManager' || meRole === 'FellowshipLeader'

  const rows = useMemo(() => sortSubGivings(children), [children])

  const [busyId, setBusyId] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleApprove(programId: string) {
    setBusyId(programId)
    setError(null)
    try {
      await approveSubGiving(api, programId)
      await onRefresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not approve sub-giving')
    } finally {
      setBusyId(null)
    }
  }

  async function handleReject(programId: string) {
    setBusyId(programId)
    setError(null)
    try {
      await rejectSubGiving(api, programId, rejectReason.trim() || undefined)
      setRejectingId(null)
      setRejectReason('')
      await onRefresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reject sub-giving')
    } finally {
      setBusyId(null)
    }
  }

  function rowTags(row: GivingProgram) {
    const tags: Array<'locked' | 'yours' | 'church'> = []
    if (isChurchDefined(row)) {
      tags.push(churchManager ? 'church' : 'locked')
    } else if (row.createdByRole === meRole) {
      tags.push('yours')
    }
    return tags
  }

  function rowActions(row: GivingProgram) {
    if (churchManager && row.approvalStatus === 'PendingPastorApproval') {
      if (rejectingId === row.id) {
        return (
          <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
            <Input
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason (optional)"
              className="h-8 w-full text-xs sm:w-40"
            />
            <div className="flex gap-1">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="border-destructive/50 text-destructive hover:bg-destructive/10"
                disabled={busyId === row.id}
                onClick={() => void handleReject(row.id)}
              >
                Confirm
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  setRejectingId(null)
                  setRejectReason('')
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )
      }

      return (
        <div className="flex flex-wrap justify-end gap-1">
          <Button
            type="button"
            size="sm"
            disabled={busyId === row.id}
            onClick={() => void handleApprove(row.id)}
          >
            <Check className="size-3.5" />
            Approve
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busyId === row.id}
            onClick={() => setRejectingId(row.id)}
          >
            <X className="size-3.5" />
            Reject
          </Button>
        </div>
      )
    }

    const canGive =
      row.approvalStatus === 'Approved' && row.status === 'Open' && row.acceptsContributions

    return (
      <Button type="button" variant="ghost" size="sm" className="h-8 px-2" asChild>
        <Link to={`/givings/${row.id}`}>
          {canGive ? (
            <>
              Open
              <ArrowRight className="ml-1 size-3.5" />
            </>
          ) : (
            <>
              <Eye className="size-3.5" />
              View
            </>
          )}
        </Link>
      </Button>
    )
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-destructive">{error}</p>}

      <section className="overflow-hidden rounded-xl border border-border/60 bg-background">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-5 py-4">
          <div>
            <h3 className="text-sm font-semibold tracking-tight">Sub givings</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {rows.length} sub-giving{rows.length === 1 ? '' : 's'}
              {isScopedLeader ? ' · locked rows are pastor-defined' : ''}
            </p>
          </div>
          {(churchManager || meRole === 'PFCCManager') && onCreateClick && (
            <Button type="button" size="sm" onClick={onCreateClick}>
              Add sub-giving
            </Button>
          )}
        </div>

        {rows.length === 0 ? (
          <p className="px-5 py-10 text-sm text-muted-foreground">
            {churchManager
              ? 'No sub givings yet. Add one to start collecting under this campaign.'
              : 'No sub givings in your scope yet.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[940px] text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-muted/20">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Title
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Period
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Scope
                  </th>
                  {churchManager && (
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Created by
                    </th>
                  )}
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Approved
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Tags
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-border/40 transition-colors last:border-0 hover:bg-muted/10"
                  >
                    <td className="px-4 py-3 align-middle">
                      <Link
                        to={`/givings/${row.id}`}
                        className="font-medium text-foreground hover:text-primary hover:underline"
                      >
                        {row.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 align-middle text-muted-foreground">{row.periodLabel}</td>
                    <td className="px-4 py-3 align-middle">
                      <ScopeKindBadge scopeKind={row.scopeKind} />
                    </td>
                    {churchManager && (
                      <td className="px-4 py-3 align-middle text-muted-foreground">
                        {programCreatorLabel(row)}
                      </td>
                    )}
                    <td className="px-4 py-3 align-middle text-right font-semibold tabular-nums">
                      {formatAmount(row.totalApprovedAmount ?? 0)}
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <div className="flex flex-wrap gap-1.5">
                        {rowTags(row).map((tag) => (
                          <SubGivingTagBadge key={tag} tag={tag} />
                        ))}
                        {row.approvalStatus !== 'Approved' && (
                          <ProgramApprovalBadge status={row.approvalStatus} />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <ProgramStatusBadge status={row.status} />
                    </td>
                    <td className="px-4 py-3 align-middle text-right">{rowActions(row)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {rows.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {isScopedLeader
            ? 'Locked sub givings are set by your pastor — you can log giving into them but cannot change them.'
            : 'Contributions are logged on approved leaf sub givings.'}
        </p>
      )}
    </div>
  )
}
