import type { ReactNode } from 'react'
import type { Contribution } from '@/api/giving'
import { formatAmount } from '@/api/giving'
import { GivingAttachmentImage } from '@/components/giving/giving-attachment-image'
import {
  contributionEntererLabel,
  contributionRemittanceSummary,
  contributionSubGivingLabel,
  contributionLegacyParentLabel,
  formatGivingDate,
  formatGivingDateTime,
  remittanceMediumLabel,
} from '@/lib/giving-ui'
import { ContributionStatusBadge, LegacyParentContributionBadge } from '@/components/giving/giving-badges'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Check, X } from 'lucide-react'

interface ContributionDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contribution: Contribution | null
  viewerRole?: string
  canAct?: boolean
  busy?: boolean
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
  onApprove,
  onReject,
}: ContributionDetailModalProps) {
  if (!contribution) return null

  const remittance = contributionRemittanceSummary(contribution)

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={contribution.memberName}
      description="Full submission details and payment proof."
      size="xl"
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-2xl font-semibold tabular-nums">
              {formatAmount(contribution.amount, contribution.currency)}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Date sent {formatGivingDate(contribution.dateSent)}
            </p>
          </div>
          <ContributionStatusBadge
            status={contribution.status}
            viewerRole={viewerRole}
            pendingApproverRole={contribution.pendingApproverRole}
          />
        </div>

        <dl className="grid gap-3 rounded-xl border border-border/60 bg-muted/10 p-4 text-sm sm:grid-cols-2">
          {contributionLegacyParentLabel(contribution) && (
            <DetailItem
              label="Logged on"
              value={
                <span className="inline-flex flex-wrap items-center gap-2">
                  Parent campaign
                  <LegacyParentContributionBadge />
                </span>
              }
              className="sm:col-span-2"
            />
          )}
          {contributionSubGivingLabel(contribution) && (
            <DetailItem
              label="Sub giving"
              value={contributionSubGivingLabel(contribution)!}
              className="sm:col-span-2"
            />
          )}
          <DetailItem label="Logged by" value={contributionEntererLabel(contribution)} />
          {remittance && <DetailItem label="Remittance" value={remittance} />}
          {contribution.sentToPastor === true && contribution.remittanceMedium && (
            <DetailItem
              label="Sent via"
              value={
                contribution.remittanceMedium === 'Other' && contribution.remittanceMediumOther
                  ? contribution.remittanceMediumOther
                  : remittanceMediumLabel(contribution.remittanceMedium)
              }
            />
          )}
          {contribution.batchId && (
            <DetailItem label="Batch" value={contribution.batchId.slice(0, 8)} />
          )}
          {contribution.approvedAt && (
            <DetailItem
              label="Approved"
              value={`${formatGivingDateTime(contribution.approvedAt)}${contribution.approvedByName ? ` · ${contribution.approvedByName}` : ''}`}
            />
          )}
          {contribution.rejectedReason && (
            <DetailItem label="Rejection reason" value={contribution.rejectedReason} />
          )}
          <DetailItem
            label="Submitted"
            value={formatGivingDateTime(contribution.createdAt)}
            className="sm:col-span-2"
          />
          {contribution.notes && (
            <DetailItem label="Notes" value={contribution.notes} className="sm:col-span-2" />
          )}
        </dl>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Payment proof
          </p>
          <GivingAttachmentImage
            attachmentKey={contribution.attachmentKey}
            alt={`${contribution.memberName} payment proof`}
            frameClassName="mx-auto max-h-80 w-full max-w-md"
            className="object-contain"
          />
        </div>

        {canAct && contribution.status === 'PendingApproval' && (
          <div className="flex justify-end gap-2 border-t border-border/60 pt-4">
            <Button type="button" variant="outline" disabled={busy} onClick={onReject}>
              <X className="size-3.5" />
              Reject
            </Button>
            <Button type="button" disabled={busy} onClick={onApprove}>
              <Check className="size-3.5" />
              Approve
            </Button>
          </div>
        )}
      </div>
    </Modal>
  )
}

function DetailItem({
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
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-foreground">{value}</dd>
    </div>
  )
}
