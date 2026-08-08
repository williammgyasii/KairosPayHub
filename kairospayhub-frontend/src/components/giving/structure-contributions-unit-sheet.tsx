import { useMemo, useState } from 'react'
import { History, LayoutGrid, Paperclip } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { formatAmount } from '@/api/giving'
import type { ContributionStructureRow, ContributionTreeNode } from '@/lib/contribution-structure'
import { collectPaymentsInSubtree } from '@/lib/contribution-structure'
import { ContributionStatusBadge } from '@/components/giving/giving-badges'
import { SideSheet } from '@/components/ui/side-sheet'
import { cn } from '@/lib/utils'

type UnitSheetTab = 'overview' | 'history' | 'attachments'

const TABS: { id: UnitSheetTab; label: string; icon: LucideIcon }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutGrid },
  { id: 'history', label: 'History', icon: History },
  { id: 'attachments', label: 'Attachments', icon: Paperclip },
]

interface StructureContributionsUnitSheetProps {
  node: ContributionTreeNode | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function StructureContributionsUnitSheet({
  node,
  open,
  onOpenChange,
}: StructureContributionsUnitSheetProps) {
  const [tab, setTab] = useState<UnitSheetTab>('overview')

  const payments = useMemo(
    () => (node ? collectPaymentsInSubtree(node) : []),
    [node],
  )

  const stats = useMemo(() => {
    if (!node) return null
    const approved = payments.filter((p) => p.status === 'Approved')
    const pending = payments.filter((p) => p.status === 'PendingApproval')
    const rejected = payments.filter((p) => p.status === 'Rejected')
    return {
      approvedTotal: approved.reduce((sum, p) => sum + p.amount, 0),
      approvedCount: approved.length,
      pendingCount: pending.length,
      rejectedCount: rejected.length,
      memberCount: new Set(payments.map((p) => p.memberId)).size,
      childCount: node.children.length,
    }
  }, [node, payments])

  if (!node) return null

  return (
    <SideSheet
      open={open}
      onOpenChange={onOpenChange}
      title={node.name}
      description={`${node.layerLabel} · ${formatAmount(node.totalAmount)}`}
      className="max-w-xl"
    >
      <nav className="-mx-1 flex gap-1 overflow-x-auto border-b border-border/60 px-1 pb-px">
        {TABS.map((item) => {
          const active = tab === item.id
          const Icon = item.icon
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={cn(
                'inline-flex shrink-0 items-center gap-1.5 border-b-2 px-2.5 py-2 text-sm font-medium transition-colors',
                active
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="size-3.5" />
              {item.label}
            </button>
          )
        })}
      </nav>

      <div className="mt-5">
        {tab === 'overview' && stats && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Stat label="Approved total" value={formatAmount(stats.approvedTotal)} />
              <Stat label="Payments" value={String(node.paymentCount)} />
              <Stat label="Members giving" value={String(stats.memberCount)} />
              <Stat label="Direct children" value={String(stats.childCount)} />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Stat label="Pending" value={String(stats.pendingCount)} />
              <Stat label="Approved" value={String(stats.approvedCount)} />
              <Stat label="Rejected" value={String(stats.rejectedCount)} />
            </div>
          </div>
        )}

        {tab === 'history' && (
          <div className="space-y-2">
            {payments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No payments in this unit yet.</p>
            ) : (
              payments.map((payment) => (
                <div
                  key={payment.id}
                  className="rounded-lg border border-border/60 px-3 py-2.5 text-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{payment.memberName}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(payment.dateSent).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold tabular-nums">
                        {formatAmount(payment.amount, payment.currency)}
                      </p>
                      <ContributionStatusBadge status={payment.status} />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'attachments' && (
          <div className="space-y-2">
            {payments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No attachments yet.</p>
            ) : (
              payments.map((payment) => (
                <AttachmentRow key={payment.id} payment={payment} />
              ))
            )}
          </div>
        )}
      </div>
    </SideSheet>
  )
}

function AttachmentRow({ payment }: { payment: ContributionStructureRow }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2.5 text-sm">
      <div className="min-w-0">
        <p className="truncate font-medium">{payment.memberName}</p>
        <p className="truncate text-xs text-muted-foreground">{payment.attachmentKey}</p>
      </div>
      <span className="shrink-0 text-xs text-muted-foreground">Screenshot on file</span>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/10 px-3 py-2.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  )
}
