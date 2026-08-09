import { formatAmount } from '@/api/giving'
import type { MemberGivingTotalsSummary } from '@/api/giving'

export type OverallGivingsSummary = MemberGivingTotalsSummary

export function OverallGivingsMetrics({ summary }: { summary: OverallGivingsSummary }) {
  return (
    <section className="rounded-xl border border-border/60 bg-muted/20 px-4 py-4 sm:px-5">
      <div className="flex flex-wrap gap-3">
        <MetricTile label="Approved total" value={formatAmount(summary.approvedTotalAmount)} />
        <MetricTile label="Members giving" value={String(summary.giversCount)} />
        <MetricTile label="Approved payments" value={String(summary.approvedPaymentCount)} />
      </div>
    </section>
  )
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[7rem] flex-1 rounded-lg border border-border/60 bg-background px-4 py-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums tracking-tight">{value}</p>
    </div>
  )
}
