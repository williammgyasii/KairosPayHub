import { useMemo } from 'react'
import type { GivingProgramRollup } from '@/api/giving'
import { formatAmount } from '@/api/giving'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

export function ProgramRollupPanel({ rollup }: { rollup: GivingProgramRollup }) {
  const grouped = useMemo(() => {
    const map = new Map<string, typeof rollup.rows>()
    for (const row of rollup.rows) {
      const list = map.get(row.layerType) ?? []
      list.push(row)
      map.set(row.layerType, list)
    }
    for (const [, rows] of map) {
      rows.sort((a, b) => b.totalAmount - a.totalAmount)
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [rollup.rows])

  const maxRowAmount = useMemo(
    () => Math.max(...rollup.rows.map((r) => r.totalAmount), 1),
    [rollup.rows],
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Giving roll-up</CardTitle>
        <CardDescription>
          Approved giving totals rolled up by structure layer
          {rollup.includesDescendants ? ' (includes sub-periods)' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-5">
          <p className="text-sm text-muted-foreground">Total approved</p>
          <p className="mt-1 text-3xl font-semibold tracking-tight">
            {formatAmount(rollup.totalApprovedAmount)}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {rollup.totalApprovedCount} approved contribution
            {rollup.totalApprovedCount === 1 ? '' : 's'}
          </p>
        </div>

        {grouped.length === 0 ? (
          <p className="text-sm text-muted-foreground">No approved contributions yet.</p>
        ) : (
          grouped.map(([layerType, rows]) => (
            <section key={layerType} className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {layerType}
              </h3>
              <ul className="space-y-2">
                {rows.slice(0, 10).map((row) => (
                  <li key={row.nodeId} className="space-y-1.5 rounded-lg border px-3 py-2.5">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-medium">{row.nodeName}</span>
                      <span>{formatAmount(row.totalAmount)}</span>
                    </div>
                    <Progress value={(row.totalAmount / maxRowAmount) * 100} className="h-1.5" />
                    <p className="text-xs text-muted-foreground">
                      {row.contributionCount} contribution{row.contributionCount === 1 ? '' : 's'}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </CardContent>
    </Card>
  )
}
