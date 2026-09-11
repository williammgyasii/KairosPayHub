import { Outlet, useOutletContext } from 'react-router-dom'
import type { DashboardOutletContext } from '@/components/layout/dashboard-layout'
import { DashboardPageHeader } from '@/components/layout/dashboard-page-header'
import { SettingsTabs } from '@/components/settings/settings-tabs'

export function SettingsLayout() {
  const context = useOutletContext<DashboardOutletContext>()

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        breadcrumbs={[
          { label: 'Dashboard', to: '/' },
          { label: 'Settings' },
        ]}
        title="Settings"
        description="Church logo (for managers), your account, and administrator access."
      />

      <SettingsTabs me={context.me} />

      <div className="min-w-0 pt-2">
        <Outlet context={context} />
      </div>
    </div>
  )
}
