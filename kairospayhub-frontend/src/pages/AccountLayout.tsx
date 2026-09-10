import { Outlet, useOutletContext } from 'react-router-dom'
import { canManageChurch } from '@/api/auth'
import type { DashboardOutletContext } from '@/components/layout/dashboard-layout'
import { DashboardPageHeader } from '@/components/layout/dashboard-page-header'
import { AccountTabs } from '@/components/settings/account-tabs'
import { SettingsTabs } from '@/components/settings/settings-tabs'

export function AccountLayout() {
  const context = useOutletContext<DashboardOutletContext>()
  const churchManager = canManageChurch(context.me.role)

  return (
    <div className="space-y-6">
      {churchManager ? (
        <>
          <DashboardPageHeader
            breadcrumbs={[
              { label: 'Dashboard', to: '/' },
              { label: 'Settings' },
            ]}
            title="Settings"
            description="Church branding, your account, and administrator access."
          />
          <SettingsTabs me={context.me} />
        </>
      ) : (
        <DashboardPageHeader
          breadcrumbs={[
            { label: 'Dashboard', to: '/' },
            { label: 'Account' },
          ]}
          title="Account"
          description="Your profile, notifications, and security settings."
        />
      )}

      <AccountTabs />
      <div className="min-w-0 pt-2">
        <Outlet context={context} />
      </div>
    </div>
  )
}
