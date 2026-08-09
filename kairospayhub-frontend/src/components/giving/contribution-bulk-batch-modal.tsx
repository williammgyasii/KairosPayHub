import { useState, type ReactNode } from 'react'
import { Eye, Users } from 'lucide-react'
import type { Contribution } from '@/api/giving'
import { formatAmount } from '@/api/giving'
import type { StructureTree } from '@/api/structure'
import { summarizeBatch, type BatchSummary } from '@/lib/contribution-batches'
import { memberPfccName } from '@/lib/contribution-structure'
import { GivingAttachmentImage } from '@/components/giving/giving-attachment-image'
import { ContributionDetailModal } from '@/components/giving/contribution-detail-modal'
import {
  contributionRemittanceSummary,
  contributionSubmittedByLabel,
  formatGivingDate,
  formatGivingDateTime,
  formatTableDate,
  givingProgramLabel,
} from '@/lib/giving-ui'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Check, X } from 'lucide-react'

type BatchTab = 'overview' | 'members'

interface ContributionBulkBatchModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contributions: Contribution[]
  tree?: StructureTree | null
  viewerRole?: string
  canAct?: boolean
  busy?: boolean
  pendingAction?: 'approve' | 'reject' | null
  onApprove?: () => void
  onReject?: () => void
}

export function ContributionBulkBatchModal({
  open,
  onOpenChange,
  contributions,
  tree = null,
  viewerRole,
  canAct,
  busy,
  pendingAction = null,
  onApprove,
  onReject,
}: ContributionBulkBatchModalProps) {
  const [tab, setTab] = useState<BatchTab>('overview')
  const [viewTarget, setViewTarget] = useState<Contribution | null>(null)

  if (contributions.length === 0) return null

  const summary = summarizeBatch(contributions[0].batchId ?? contributions[0].id, contributions)
  const remittance = contributionRemittanceSummary(summary)
  const pfccName = memberPfccName(tree, summary.memberParentNodeId)
  const sortedMembers = [...contributions].sort((a, b) =>
    a.memberName.localeCompare(b.memberName, undefined, { sensitivity: 'base' }),
  )

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setTab('overview')
      setViewTarget(null)
    }
    onOpenChange(nextOpen)
  }

  return (
    <>
      <Modal
        open={open}
        onOpenChange={handleOpenChange}
        title={`Bulk batch · ${summary.memberCount} members`}
        description={`${givingProgramLabel(summary)} · ${formatTableDate(summary.dateSent)}`}
        size="xl"
        className="max-w-4xl"
      >
        <div className="space-y-5">
          <div className="flex flex-wrap gap-2 border-b border-border/60 pb-3">
            <BatchTabButton active={tab === 'overview'} onClick={() => setTab('overview')}>
              Overview
            </BatchTabButton>
            <BatchTabButton active={tab === 'members'} onClick={() => setTab('members')}>
              <Users className="size-3.5" />
              Members
              <Badge variant="secondary" className="ml-1 tabular-nums">
                {summary.memberCount}
              </Badge>
            </BatchTabButton>
          </div>

          {tab === 'overview' ? (
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-4">
                <dl className="grid gap-4 sm:grid-cols-2">
                  <DetailField label="Campaign" value={givingProgramLabel(summary)} className="sm:col-span-2" />
                  <DetailField
                    label="Batch total"
                    value={
                      <span className="text-xl font-semibold tabular-nums">
                        {formatAmount(summary.totalAmount, summary.currency)}
                      </span>
                    }
                  />
                  <DetailField label="Members" value={String(summary.memberCount)} />
                  <DetailField label="Date sent" value={formatTableDate(summary.dateSent)} />
                  <DetailField label="Submitted" value={formatGivingDateTime(summary.createdAt)} />
                  <DetailField label="Logged by" value={contributionSubmittedByLabel(summary)} />
                  <DetailField label="PFCC" value={pfccName} />
                  {remittance && (
                    <DetailField label="Remittance" value={remittance} className="sm:col-span-2" />
                  )}
                  {summary.notes && (
                    <DetailField label="Notes" value={summary.notes} className="sm:col-span-2" />
                  )}
                </dl>
              </div>

              <div className="flex min-h-[280px] flex-col">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Shared payment proof
                </p>
                <div className="mt-3 flex flex-1 items-center justify-center rounded-lg bg-muted/20 p-3">
                  <GivingAttachmentImage
                    attachmentKey={summary.attachmentKey}
                    alt="Bulk batch payment proof"
                    frameClassName="w-full max-h-[360px]"
                    className="max-h-[360px] object-contain"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border/60">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/20">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Member
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Date sent
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedMembers.map((entry) => (
                    <tr key={entry.id} className="border-b border-border/40 last:border-b-0">
                      <td className="px-4 py-3 font-medium">{entry.memberName}</td>
                      <td className="px-4 py-3 tabular-nums">
                        {formatAmount(entry.amount, entry.currency)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatGivingDate(entry.dateSent)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8"
                            onClick={() => setViewTarget(entry)}
                          >
                            <Eye className="size-3.5" />
                            View
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {canAct && (
            <div className="flex justify-end gap-2 border-t border-border/60 pt-4">
              <Button
                type="button"
                variant="outline"
                disabled={busy && pendingAction === 'approve'}
                loading={busy && pendingAction === 'reject'}
                loadingLabel="Rejecting…"
                onClick={onReject}
              >
                <X className="size-3.5" />
                Reject batch
              </Button>
              <Button
                type="button"
                disabled={busy && pendingAction === 'reject'}
                loading={busy && pendingAction === 'approve'}
                loadingLabel="Approving…"
                onClick={onApprove}
              >
                <Check className="size-3.5" />
                Approve batch
              </Button>
            </div>
          )}
        </div>
      </Modal>

      <ContributionDetailModal
        open={viewTarget !== null}
        onOpenChange={(nextOpen) => !nextOpen && setViewTarget(null)}
        contribution={viewTarget}
        viewerRole={viewerRole}
      />
    </>
  )
}

function BatchTabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors',
        active
          ? 'bg-primary text-primary-foreground shadow-sm'
          : 'text-muted-foreground hover:bg-accent/80 hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}

function DetailField({
  label,
  value,
  className,
}: {
  label: string
  value: ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1.5 text-sm text-foreground">{value}</dd>
    </div>
  )
}
