import { useMemo, useState } from 'react'
import type { Contribution, ContributionStatus } from '@/api/giving'
import { formatAmount } from '@/api/giving'
import { ContributionStatusBadge } from '@/components/giving/giving-badges'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const FILTER_OPTIONS: { value: 'all' | ContributionStatus; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'PendingApproval', label: 'Pending' },
  { value: 'Approved', label: 'Approved' },
  { value: 'Rejected', label: 'Rejected' },
]

export function ContributionsList({ contributions }: { contributions: Contribution[] }) {
  const [filter, setFilter] = useState<'all' | ContributionStatus>('all')

  const filtered = useMemo(() => {
    if (filter === 'all') return contributions
    return contributions.filter((c) => c.status === filter)
  }, [contributions, filter])

  const counts = useMemo(() => {
    const pending = contributions.filter((c) => c.status === 'PendingApproval').length
    const approved = contributions.filter((c) => c.status === 'Approved').length
    const rejected = contributions.filter((c) => c.status === 'Rejected').length
    return { pending, approved, rejected, all: contributions.length }
  }, [contributions])

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>Contributions</CardTitle>
        <div className="flex flex-wrap gap-1.5">
          {FILTER_OPTIONS.map((option) => {
            const count =
              option.value === 'all'
                ? counts.all
                : option.value === 'PendingApproval'
                  ? counts.pending
                  : option.value === 'Approved'
                    ? counts.approved
                    : counts.rejected
            if (option.value !== 'all' && count === 0) return null
            const active = filter === option.value
            return (
              <button
                key={option.value}
                type="button"
                className={cn(
                  'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                  active
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:bg-muted/40',
                )}
                onClick={() => setFilter(option.value)}
              >
                {option.label}
                {count > 0 ? ` (${count})` : ''}
              </button>
            )
          })}
        </div>
      </CardHeader>
      <CardContent>
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">No contributions in this view.</p>
        ) : (
          <ul className="divide-y divide-border/60 rounded-xl border border-border/60">
            {filtered.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-medium">{c.memberName}</p>
                  <p className="text-muted-foreground">
                    {formatAmount(c.amount, c.currency)} ·{' '}
                    {new Date(c.dateSent).toLocaleDateString()}
                    {c.notes ? ` · ${c.notes}` : ''}
                  </p>
                  {c.rejectedReason && (
                    <p className="mt-1 text-xs text-destructive">Rejected: {c.rejectedReason}</p>
                  )}
                </div>
                <ContributionStatusBadge status={c.status} />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
