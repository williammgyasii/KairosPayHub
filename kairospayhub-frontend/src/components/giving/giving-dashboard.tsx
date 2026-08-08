import { Link } from 'react-router-dom'
import type { GivingDashboardCampaign } from '@/api/giving'
import { formatAmount } from '@/api/giving'
import { givingTypeLabel } from '@/lib/giving-ui'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function GivingDashboardPanel({ campaigns }: { campaigns: GivingDashboardCampaign[] }) {
  const totalApproved = campaigns.reduce((sum, c) => sum + c.totalApprovedAmount, 0)

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="border-primary/20 bg-primary/5 lg:col-span-1">
        <CardHeader className="pb-2">
          <CardDescription>Open campaigns</CardDescription>
          <CardTitle className="text-3xl">{campaigns.length}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {formatAmount(totalApproved)} approved across active givings
          </p>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Campaign totals</CardTitle>
          <CardDescription>Approved giving rolled up from sub-periods</CardDescription>
        </CardHeader>
        <CardContent>
          {campaigns.length === 0 ? (
            <p className="text-sm text-muted-foreground">No open campaigns.</p>
          ) : (
            <ul className="divide-y divide-border/60">
              {campaigns.map((campaign) => (
                <li key={campaign.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <Link
                      to={`/givings/${campaign.id}`}
                      className="truncate font-medium hover:text-primary hover:underline"
                    >
                      {campaign.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {givingTypeLabel(campaign.givingType)} · {campaign.periodLabel}
                      {campaign.subPeriodCount > 0
                        ? ` · ${campaign.subPeriodCount} sub-period${campaign.subPeriodCount === 1 ? '' : 's'}`
                        : ''}
                    </p>
                  </div>
                  <span className="shrink-0 font-semibold tabular-nums">
                    {formatAmount(campaign.totalApprovedAmount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
