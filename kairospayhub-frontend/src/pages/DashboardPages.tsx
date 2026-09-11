import { useMemo } from 'react'
import { Gift } from 'lucide-react'
import { Link, useOutletContext } from 'react-router-dom'
import type { DashboardOutletContext } from '@/shared/layout/dashboard-layout'
import { DashboardPageHeader } from '@/shared/layout/dashboard-page-header'
import {
  DashboardSetupPreview,
  PastorDashboardHome,
} from '@/components/overview/dashboard-home'
import { LeaderOverviewDashboard } from '@/components/overview/leader-overview-dashboard'
import { StructureSetupCallout } from '@/components/overview/structure-setup-callout'
import { dashboardWelcomeSubtitle } from '@/lib/dashboard-setup-actions'
import { useGetGivingDashboardQuery } from '@/features/giving/api/givingApi'
import { formatRtkQueryError } from '@/store/baseQuery'
import {
  canManageChurch,
  displayName,
  isCellLeader,
  isScopedLeader,
  rollCallScopesFor,
} from '@/api/auth'
import { canAccessEvents } from '@/features/events'
import { useAuth } from '@/auth/AuthContext'
import { filterTreeToSubtree } from '@/shared/lib/structure-tree'
import { useStructureTree } from '@/shared/lib/use-structure-tree'
import { hasTemplate } from '@/lib/structure-dashboard'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { Spinner } from '@/shared/ui/spinner'

function LeaderOverviewFallback() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Gift className="size-4 text-primary" />
          Your givings
        </CardTitle>
        <CardDescription>
          Open Givings to view campaigns, log contributions, and track approvals in your scope.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild>
          <Link to="/givings">Go to Givings</Link>
        </Button>
      </CardContent>
    </Card>
  )
}

export function DashboardPage() {
  const { me } = useOutletContext<DashboardOutletContext>()
  const { email } = useAuth()
  const { tree } = useStructureTree()
  const showDashboard = hasTemplate(tree)
  const churchManager = canManageChurch(me.role)
  const scopedLeader = isScopedLeader(me.role)
  const cellLeader = isCellLeader(me.role)
  const leaderDashboardRole = scopedLeader || cellLeader
  const {
    data: leaderDashboard,
    isLoading: dashboardLoading,
    error: dashboardQueryError,
  } = useGetGivingDashboardQuery(undefined, { skip: !leaderDashboardRole })
  const dashboardError = dashboardQueryError ? formatRtkQueryError(dashboardQueryError) : null

  const scopedTree = useMemo(() => {
    if (!tree) return tree
    if (cellLeader) {
      const cellScopeId =
        rollCallScopesFor(me)[0]?.scopeNodeId ?? me.scopeNodeId ?? null
      return cellScopeId ? filterTreeToSubtree(tree, cellScopeId) : tree
    }
    if (scopedLeader && me.scopeNodeId) {
      return filterTreeToSubtree(tree, me.scopeNodeId)
    }
    return tree
  }, [tree, cellLeader, scopedLeader, me])

  const scopeTitle =
    leaderDashboard?.scopeUnitName ??
    rollCallScopesFor(me)[0]?.scopeUnitName ??
    me.scopeUnitName ??
    me.churchName ??
    'Your church'

  const firstName = displayName(me, email).split(' ')[0] || 'Pastor'

  const pastorSubtitle =
    showDashboard && tree
      ? dashboardWelcomeSubtitle(tree)
      : 'Define your structure chain, populate Roster, then register members in Membership.'

  const showPageHeader =
    leaderDashboardRole || (churchManager && !showDashboard)

  return (
    <div className="space-y-6 sm:space-y-8">
      {showPageHeader ? (
        <DashboardPageHeader
          breadcrumbs={[{ label: 'Dashboard' }]}
          title={leaderDashboardRole ? scopeTitle : 'Dashboard'}
          description={
            cellLeader
              ? 'Your cell — members, givings, and attendance.'
              : scopedLeader
                ? me.role === 'FellowshipLeader'
                  ? 'Cells, members, and giving in your fellowship.'
                  : 'Metrics and giving for your PFCC scope.'
                : pastorSubtitle
          }
        />
      ) : null}

      {churchManager && !showDashboard ? (
        <StructureSetupCallout tree={tree} churchName={me.churchName} />
      ) : null}

      {leaderDashboardRole && showDashboard && scopedTree ? (
        dashboardLoading ? (
          <Spinner label="Loading your dashboard…" />
        ) : dashboardError ? (
          <p className="text-sm text-destructive">{dashboardError}</p>
        ) : leaderDashboard ? (
          <LeaderOverviewDashboard
            tree={scopedTree}
            dashboard={leaderDashboard}
            role={me.role}
          />
        ) : null
      ) : churchManager && showDashboard && scopedTree ? (
        <PastorDashboardHome
          tree={scopedTree}
          firstName={firstName}
          showEvents={canAccessEvents(me)}
        />
      ) : churchManager ? (
        <DashboardSetupPreview tree={tree} />
      ) : (
        <LeaderOverviewFallback />
      )}
    </div>
  )
}


export function ComingSoonPage({ feature }: { feature: string }) {
  return (
    <div className="space-y-6">
      <DashboardPageHeader
        breadcrumbs={[
          { label: 'Dashboard', to: '/' },
          { label: feature },
        ]}
        title={feature}
        description="This section is coming in the next implementation phase."
      />
      <Card>
        <CardHeader>
          <CardTitle>{feature}</CardTitle>
          <CardDescription>This section is coming in the next implementation phase.</CardDescription>
        </CardHeader>
      </Card>
    </div>
  )
}
