import { useState } from 'react'
import { Check, X } from 'lucide-react'
import type { Contribution } from '@/api/giving'
import { formatAmount } from '@/api/giving'
import { RejectContributionModal } from '@/components/giving/reject-contribution-modal'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface PendingApprovalQueueProps {
  contributions: Contribution[]
  canAct: boolean
  busy?: boolean
  onApprove: (contributionId: string) => Promise<void>
  onReject: (contributionId: string, reason: string | null) => Promise<void>
}

export function PendingApprovalQueue({
  contributions,
  canAct,
  busy,
  onApprove,
  onReject,
}: PendingApprovalQueueProps) {
  const [rejectTarget, setRejectTarget] = useState<Contribution | null>(null)

  if (contributions.length === 0) return null

  return (
    <>
      <Card className="border-amber-200/50 bg-amber-500/[0.03]">
        <CardHeader>
          <CardTitle>Pending approval</CardTitle>
          <CardDescription>
            {contributions.length} contribution{contributions.length === 1 ? '' : 's'} waiting for
            review
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {contributions.map((c) => (
            <div
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-background px-4 py-3"
            >
              <div className="min-w-0">
                <p className="font-medium">{c.memberName}</p>
                <p className="text-sm text-muted-foreground">
                  {formatAmount(c.amount, c.currency)} ·{' '}
                  {new Date(c.dateSent).toLocaleDateString()}
                </p>
                {c.notes && (
                  <p className="mt-1 truncate text-xs text-muted-foreground">{c.notes}</p>
                )}
              </div>
              {canAct && (
                <div className="flex shrink-0 gap-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={busy}
                    onClick={() => void onApprove(c.id)}
                  >
                    <Check className="size-3.5" />
                    Approve
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => setRejectTarget(c)}
                  >
                    <X className="size-3.5" />
                    Reject
                  </Button>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <RejectContributionModal
        open={rejectTarget !== null}
        onOpenChange={(open) => !open && setRejectTarget(null)}
        memberName={rejectTarget?.memberName ?? 'Member'}
        busy={busy}
        onConfirm={(reason) => {
          if (!rejectTarget) return
          void onReject(rejectTarget.id, reason).finally(() => setRejectTarget(null))
        }}
      />
    </>
  )
}
