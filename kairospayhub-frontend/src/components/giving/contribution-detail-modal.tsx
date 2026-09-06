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
  const subGiving = contributionSubGivingLabel(contribution)
  const showActions = canAct && contribution.status === 'PendingApproval'

  const meta: Array<{ label: string; value: ReactNode }> = [
    {
      label: 'Amount',
      value: (
        <span className="text-base font-semibold tabular-nums tracking-tight">
          {formatAmount(contribution.amount, contribution.currency)}
        </span>
      ),
    },
    { label: 'Date sent', value: formatGivingDate(contribution.dateSent) },
    { label: 'Logged by', value: contributionEntererLabel(contribution) },
    {
      label: 'Status',
      value: (
        <ContributionStatusBadge
          status={contribution.status}
          viewerRole={viewerRole}
          pendingApproverRole={contribution.pendingApproverRole}
          className="h-5 px-1.5 text-[10px]"
        />
      ),
    },
    { label: 'Submitted', value: formatGivingDateTime(contribution.createdAt) },
    ...(subGiving ? [{ label: 'Campaign', value: subGiving }] : []),
    ...(contributionLegacyParentLabel(contribution)
      ? [
          {
            label: 'Logged on',
            value: (
              <span className="inline-flex flex-wrap items-center gap-1.5">
                Parent campaign
                <LegacyParentContributionBadge className="scale-90" />
              </span>
            ),
          },
        ]
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
            value: `${formatGivingDateTime(contribution.approvedAt)}${
              contribution.approvedByName ? ` · ${contribution.approvedByName}` : ''
            }`,
          },
        ]
      : []),
    ...(contribution.rejectedReason
      ? [{ label: 'Rejection', value: contribution.rejectedReason }]
      : []),
    ...(contribution.notes ? [{ label: 'Notes', value: contribution.notes }] : []),
  ]

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={contribution.memberName}
      description={`${contribution.programTitle}${
        contribution.programPeriodLabel ? ` · ${contribution.programPeriodLabel}` : ''
      }`}
      size="xl"
      className="max-w-4xl"
      contentClassName="p-0"
    >
      <div className="grid md:grid-cols-[minmax(0,1fr)_minmax(300px,1.15fr)]">
        <dl className="grid grid-cols-2 content-start border-b border-border/60 md:border-b-0 md:border-r">
          {meta.map((field) => (
            <div
              key={field.label}
              className={cn(
                'border-b border-border/50 px-4 py-3',
                (field.label === 'Notes' || field.label === 'Rejection') && 'col-span-2',
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
            Payment proof
          </p>
          <div className="mt-3 flex flex-1 items-center justify-center rounded-lg border border-primary/25 bg-background p-3 shadow-[0_0_0_3px_oklch(0.55_0.12_250/0.08)] ring-1 ring-primary/15">
            <GivingAttachmentImage
              attachmentKey={contribution.attachmentKey}
              alt={`${contribution.memberName} payment proof`}
              frameClassName="w-full max-h-[380px]"
              className="max-h-[380px] object-contain"
            />
          </div>
        </div>
      </div>

      {showActions && (
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
            Reject
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
            Approve
          </Button>
        </div>
      )}
    </Modal>
  )
}
