import { useEffect, useState } from 'react'
import { operatorGet } from '@/features/outreach/lib/operator-session'
import { OperatorShell } from '@/features/outreach/components/operator-shell'

type Metrics = {
  total: number
  scouted: number
  responded: number
  converted: number
  success: number
  failure: number
}

export function SuperadminOutreachPage() {
  const [metrics, setMetrics] = useState<Metrics>({
    total: 0,
    scouted: 0,
    responded: 0,
    converted: 0,
    success: 0,
    failure: 0,
  })

  useEffect(() => {
    let cancelled = false
    operatorGet<Metrics>('/api/outreach/metrics')
      .then((result) => {
        if (!cancelled) setMetrics(result)
      })
      .catch(() => {
        if (!cancelled) setMetrics({ total: 0, scouted: 0, responded: 0, converted: 0, success: 0, failure: 0 })
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <OperatorShell>
      <main>
        <h1 className="text-page-title">Dashboard</h1>
        <p className="mt-2 text-sm text-muted-foreground">Saved churches and where each lead stands.</p>
        <dl className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Churches" value={metrics.total} />
          <Metric label="Scouted" value={metrics.scouted} />
          <Metric label="Responded" value={metrics.responded} />
          <Metric label="Converted" value={metrics.converted} />
          <Metric label="Success" value={metrics.success ?? 0} />
          <Metric label="Failure" value={metrics.failure ?? 0} />
        </dl>
      </main>
    </OperatorShell>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-card px-4 py-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-3xl font-semibold">{value}</dd>
    </div>
  )
}
