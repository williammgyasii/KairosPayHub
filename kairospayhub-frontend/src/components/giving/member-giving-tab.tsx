import { useEffect, useState } from 'react'
import { Coins, ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useApi } from '@/api/core'
import {
  formatAmount,
  formatContributionStatus,
  listMemberContributions,
  type Contribution,
} from '@/api/giving'
import { formatGivingDate } from '@/lib/giving-ui'
import { ContributionStatusBadge } from '@/components/giving/giving-badges'
import { Spinner } from '@/components/ui/spinner'
import { Button } from '@/components/ui/button'

export function MemberGivingTab({ memberId }: { memberId: string }) {
  const api = useApi()
  const [rows, setRows] = useState<Contribution[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        setRows(await listMemberContributions(api, memberId))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load giving history')
      } finally {
        setLoading(false)
      }
    })()
  }, [api, memberId])

  if (loading) return <Spinner label="Loading giving history…" />

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/10 px-6 py-12 text-center">
        <Coins className="size-8 text-muted-foreground/70" />
        <p className="mt-4 text-sm font-medium">No contributions yet</p>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Giving contributions logged by cell leaders will appear here once submitted.
        </p>
      </div>
    )
  }

  const approvedTotal = rows
    .filter((r) => r.status === 'Approved')
    .reduce((sum, r) => sum + r.amount, 0)

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border/60 bg-muted/10 px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Approved total
        </p>
        <p className="mt-1 text-xl font-semibold">{formatAmount(approvedTotal)}</p>
      </div>

      <ul className="space-y-2">
        {rows.map((row) => (
          <li
            key={row.id}
            className="rounded-lg border border-border/60 bg-background px-3 py-3 text-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium">{formatAmount(row.amount, row.currency)}</p>
                <p className="text-xs text-muted-foreground">
                  Sent {formatGivingDate(row.dateSent)} ·{' '}
                  {formatContributionStatus(row.status)}
                </p>
                {row.notes && (
                  <p className="mt-1 text-xs text-muted-foreground">{row.notes}</p>
                )}
                {row.rejectedReason && (
                  <p className="mt-1 text-xs text-destructive">{row.rejectedReason}</p>
                )}
              </div>
              <ContributionStatusBadge status={row.status} />
            </div>
            <Button type="button" variant="ghost" size="sm" className="mt-2 h-8 px-2" asChild>
              <Link to={`/givings/${row.programId}`}>
                View giving
                <ExternalLink className="size-3.5" />
              </Link>
            </Button>
          </li>
        ))}
      </ul>
    </div>
  )
}
