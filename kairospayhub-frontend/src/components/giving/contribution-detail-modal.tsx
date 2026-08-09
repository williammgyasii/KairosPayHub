import type { ReactNode } from 'react'
import type { Contribution } from '@/api/giving'
import { formatAmount } from '@/api/giving'
import { GivingAttachmentImage } from '@/components/giving/giving-attachment-image'
import {
  ContributionStatusBadge,
  LegacyParentContributionBadge,
} from '@/components/giving/giving-badges'
import {
  contributionEntererLabel,
  contributionLegacyParentLabel,
  contributionRemittanceSummary,
  contributionSubGivingLabel,
  formatGivingDate,
  formatGivingDateTime,
  remittanceMediumLabel,
} from '@/lib/giving-ui'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Check, X } from 'lucide-react'

interface ContributionDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contribution: Contribution | null
  viewerRole?: string
  canAct?: boolean
  busy?: boolean
  pendingAction?: 'approve' | 'reject' | null
  onApprove?: () => void
  onReject?: () => void
}

export function ContributionDetailModal({
  open,
  onOpenChange,
  contribution,
  viewerRole,
  canAct,
  busy,
  pendingAction = null,
  onApprove,
  onReject,
}: ContributionDetailModalProps) {
  if (!contribution) return null

  const remittance = contributionRemittanceSummary(contribution)
  const sentVia =
    contribution.sentToPastor === true && contribution.remittanceMedium
      ? contribution.remittanceMedium === 'Other' && contribution.remittanceMediumOther
        ? contribution.remittanceMediumOther
        : remittanceMediumLabel(contribution.remittanceMedium)
      : null

  const detailFields: Array<{ label: string; value: ReactNode; span?: 2 }> = [
    { label: 'Submitted', value: formatGivingDateTime(contribution.createdAt) },
    ...(contributionLegacyParentLabel(contribution)
      ? [
          {
            label: 'Logged on',
            value: (
              <span className="inline-flex flex-wrap items-center gap-2">
                Parent campaign
                <LegacyParentContributionBadge />
              </span>
            ),
            span: 2 as const,
          },
        ]
      : []),
    ...(contributionSubGivingLabel(contribution)
      ? [{ label: 'Sub giving', value: contributionSubGivingLabel(contribution)!, span: 2 as const }]
      : []),
    ...(remittance ? [{ label: 'Remittance', value: remittance }] : []),
    ...(sentVia ? [{ label: 'Sent via', value: sentVia }] : []),
    ...(contribution.batchId
      ? [{ label: 'Batch', value: contribution.batchId.slice(0, 8).toUpperCase() }]
      : []),
    ...(contribution.approvedAt
      ? [
          {
            label: 'Approved',
            value: `${formatGivingDateTime(contribution.approvedAt)}${contribution.approvedByName ? ` · ${contribution.approvedByName}` : ''}`,
          },
        ]
      : []),
    ...(contribution.rejectedReason
      ? [{ label: 'Rejection reason', value: contribution.rejectedReason, span: 2 as const }]
      : []),
    ...(contribution.notes ? [{ label: 'Notes', value: contribution.notes, span: 2 as const }] : []),
  ]

  const showActions = canAct && contribution.status === 'PendingApproval'

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={contribution.memberName}
      description="Review submission details and payment proof before approving."
      size="xl"
      className="max-w-4xl"
    >
      <div className="grid gap-6">
        <dl className="grid gap-4 border-b border-border/60 pb-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          <DetailField label="Amount">
            <span className="text-xl font-semibold tabular-nums tracking-tight">
              {formatAmount(contribution.amount, contribution.currency)}
            </span>
          </DetailField>
          <DetailField label="Date sent" value={formatGivingDate(contribution.dateSent)} />
          <DetailField label="Logged by" value={contributionEntererLabel(contribution)} />
          <DetailField label="Status">
            <ContributionStatusBadge
              status={contribution.status}
              viewerRole={viewerRole}
              pendingApproverRole={contribution.pendingApproverRole}
            />
          </DetailField>
        </dl>

        <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
          <dl className="grid gap-4 sm:grid-cols-2">
            {detailFields.map((field) => (
              <DetailField
                key={field.label}
                label={field.label}
                value={field.value}
                className={field.span === 2 ? 'sm:col-span-2' : undefined}
              />
            ))}
          </dl>

          <div className="flex min-h-[280px] flex-col">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Payment proof
            </p>
            <div className="mt-3 flex flex-1 items-center justify-center rounded-lg bg-muted/20 p-3">
              <GivingAttachmentImage
                attachmentKey={contribution.attachmentKey}
                alt={`${contribution.memberName} payment proof`}
                frameClassName="w-full max-h-[360px]"
                className="max-h-[360px] object-contain"
              />
            </div>
          </div>
        </div>

        {showActions && (
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
              Reject
            </Button>
            <Button
              type="button"
              disabled={busy && pendingAction === 'reject'}
              loading={busy && pendingAction === 'approve'}
              loadingLabel="Approving…"
              onClick={onApprove}
            >
              <Check className="size-3.5" />
              Approve
            </Button>
          </div>
        )}
      </div>
    </Modal>
  )
}

function DetailField({
  label,
  value,
  children,
  className,
}: {
  label: string
  value?: ReactNode
  children?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('min-w-0', className)}>
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1.5 text-sm text-foreground">{children ?? value}</dd>
    </div>
  )
}
