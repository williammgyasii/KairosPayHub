import { useState, type ReactNode } from 'react'
import { Check, Eye, MoreHorizontal, Users, X } from 'lucide-react'
import type { Contribution } from '@/api/giving'
import { formatAmount } from '@/api/giving'
import type { StructureTree } from '@/api/structure'
import { summarizeBatch } from '@/lib/contribution-batches'
import {
  memberStructureUnitLabel,
  structureScopeColumnLabel,
} from '@/lib/contribution-structure'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

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
  const unitLabel = memberStructureUnitLabel(tree, summary.memberParentNodeId)
  const unitColumn = structureScopeColumnLabel(tree)
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

  const meta: Array<{ label: string; value: ReactNode; wide?: boolean }> = [
    {
      label: 'Batch total',
      value: (
        <span className="text-base font-semibold tabular-nums">
          {formatAmount(summary.totalAmount, summary.currency)}
        </span>
      ),
    },
    { label: 'Members', value: String(summary.memberCount) },
    { label: 'Date sent', value: formatTableDate(summary.dateSent) },
    { label: 'Submitted', value: formatGivingDateTime(summary.createdAt) },
    { label: 'Logged by', value: contributionSubmittedByLabel(summary), wide: true },
    { label: unitColumn, value: unitLabel },
    { label: 'Campaign', value: givingProgramLabel(summary), wide: true },
    ...(remittance ? [{ label: 'Remittance', value: remittance, wide: true }] : []),
    ...(summary.notes ? [{ label: 'Notes', value: summary.notes, wide: true }] : []),
  ]

  return (
    <>
      <Modal
        open={open}
        onOpenChange={handleOpenChange}
        title={`Batch · ${summary.memberCount} members`}
        description={`${givingProgramLabel(summary)} · ${formatTableDate(summary.dateSent)}`}
        size="xl"
        className="max-w-4xl"
        contentClassName="p-0"
      >
        <div className="flex gap-1 border-b border-border/60 px-3 pt-2">
          <BatchTabButton active={tab === 'overview'} onClick={() => setTab('overview')}>
            Overview
          </BatchTabButton>
          <BatchTabButton active={tab === 'members'} onClick={() => setTab('members')}>
            <Users className="size-3.5 opacity-70" />
            Members
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px] tabular-nums">
              {summary.memberCount}
            </Badge>
          </BatchTabButton>
        </div>

        {tab === 'overview' ? (
          <div className="grid md:grid-cols-[minmax(0,1fr)_minmax(300px,1.15fr)]">
            <dl className="grid grid-cols-2 content-start border-b border-border/60 md:border-b-0 md:border-r">
              {meta.map((field) => (
                <div
                  key={field.label}
                  className={cn(
                    'border-b border-border/50 px-4 py-3',
                    field.wide && 'col-span-2',
                  )}
                >
                  <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {field.label}
                  </dt>
                  <dd className="mt-1 text-sm leading-snug text-foreground">{field.value}</dd>
                </div>
              ))}
            </dl>

            <div className="flex min-h-[320px] flex-col bg-muted/20 p-4 md:min-h-[420px]">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Shared payment proof
              </p>
              <div className="mt-3 flex flex-1 items-center justify-center rounded-lg border border-primary/25 bg-background p-3 shadow-[0_0_0_3px_oklch(0.55_0.12_250/0.08)] ring-1 ring-primary/15">
                <GivingAttachmentImage
                  attachmentKey={summary.attachmentKey}
                  alt="Bulk batch payment proof"
                  frameClassName="w-full max-h-[380px]"
                  className="max-h-[380px] object-contain"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-muted/20">
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Member
                  </th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Amount
                  </th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Date sent
                  </th>
                  <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedMembers.map((entry) => (
                  <tr key={entry.id} className="border-b border-border/40 last:border-b-0">
                    <td className="px-4 py-2.5 text-sm font-medium">{entry.memberName}</td>
                    <td className="px-4 py-2.5 text-sm tabular-nums">
                      {formatAmount(entry.amount, entry.currency)}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">
                      {formatGivingDate(entry.dateSent)}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-8 text-muted-foreground"
                            aria-label={`Actions for ${entry.memberName}`}
                          >
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-36">
                          <DropdownMenuItem
                            className="gap-2"
                            onClick={() => setViewTarget(entry)}
                          >
                            <Eye className="size-3.5 opacity-70" />
                            View
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {canAct && (
          <div className="flex justify-end gap-2 border-t border-border/60 px-4 py-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy && pendingAction === 'approve'}
              loading={busy && pendingAction === 'reject'}
              loadingLabel="Rejecting…"
              onClick={onReject}
            >
              <X className="size-3.5 opacity-70" />
              Reject batch
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={busy && pendingAction === 'reject'}
              loading={busy && pendingAction === 'approve'}
              loadingLabel="Approving…"
              onClick={onApprove}
            >
              <Check className="size-3.5 opacity-70" />
              Approve batch
            </Button>
          </div>
        )}
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
        'inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-semibold transition-colors',
        active
          ? 'border-primary text-foreground'
          : 'border-transparent text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}
