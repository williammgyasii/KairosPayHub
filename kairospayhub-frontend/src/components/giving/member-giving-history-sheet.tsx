import { useState } from 'react'
import { Eye } from 'lucide-react'
import { formatAmount } from '@/api/giving'
import type {
  ContributionStructureRow,
  MemberGivingHistory,
} from '@/lib/contribution-structure'
import {
  contributionEntererLabel,
  contributionLegacyParentLabel,
  formatGivingDate,
} from '@/lib/giving-ui'
import { ContributionDetailModal } from '@/components/giving/contribution-detail-modal'
import {
  ContributionStatusBadge,
  LegacyParentContributionBadge,
} from '@/components/giving/giving-badges'
import { SideSheet } from '@/components/ui/side-sheet'
import { Button } from '@/components/ui/button'

interface MemberGivingHistorySheetProps {
  member: MemberGivingHistory | null
  open: boolean
  onOpenChange: (open: boolean) => void
  viewerRole?: string
}

export function MemberGivingHistorySheet({
  member,
  open,
  onOpenChange,
  viewerRole,
}: MemberGivingHistorySheetProps) {
  const [viewTarget, setViewTarget] = useState<ContributionStructureRow | null>(null)

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) setViewTarget(null)
    onOpenChange(nextOpen)
  }

  if (!member) return null

  return (
    <>
      <SideSheet
        open={open}
        onOpenChange={handleOpenChange}
        title={member.memberName}
        description={member.structurePath}
        className="max-w-lg"
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 py-4">
          <div className="grid grid-cols-3 gap-3 rounded-xl border border-border/60 bg-muted/10 p-3 text-sm">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Payments
              </p>
              <p className="mt-1 font-semibold tabular-nums">{member.contributionCount}</p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Approved
              </p>
              <p className="mt-1 font-semibold tabular-nums">{formatAmount(member.approvedTotal)}</p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Pending
              </p>
              <p className="mt-1 font-semibold tabular-nums">{member.pendingCount}</p>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {member.entries.length === 0 ? (
              <p className="text-sm text-muted-foreground">No payments logged for this member yet.</p>
            ) : (
              member.entries.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-lg border border-border/60 bg-background px-3 py-2.5 text-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold tabular-nums">
                          {formatAmount(entry.amount, entry.currency)}
                        </p>
                        {entry.isLegacyParentContribution && <LegacyParentContributionBadge />}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Sent {formatGivingDate(entry.dateSent)}
                        {contributionLegacyParentLabel(entry)
                          ? ` · ${contributionLegacyParentLabel(entry)}`
                          : ''}
                        {' · '}
                        Logged by {contributionEntererLabel(entry)}
                      </p>
                      {entry.notes && (
                        <p className="mt-1 text-xs text-muted-foreground">{entry.notes}</p>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <ContributionStatusBadge
                        status={entry.status}
                        viewerRole={viewerRole}
                        pendingApproverRole={entry.pendingApproverRole}
                      />
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
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </SideSheet>

      <ContributionDetailModal
        open={viewTarget !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setViewTarget(null)
        }}
        contribution={viewTarget}
        viewerRole={viewerRole}
      />
    </>
  )
}
