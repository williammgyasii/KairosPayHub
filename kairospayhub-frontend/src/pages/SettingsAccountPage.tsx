import { useEffect } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import type { DashboardOutletContext } from '@/components/layout/dashboard-layout'
import { DashboardPageHeader } from '@/components/layout/dashboard-page-header'
import { SettingsTabs } from '@/components/settings/settings-tabs'
import {
  SettingsField,
  SettingsFieldGrid,
  SettingsPanel,
  SettingsSection,
} from '@/components/settings/settings-section'
import { canManageChurch } from '@/api/auth'
import { Button } from '@/components/ui/button'

export function SettingsAccountPage() {
  const { me } = useOutletContext<DashboardOutletContext>()
  const churchManager = canManageChurch(me.role)

  useEffect(() => {
    const hash = window.location.hash.replace('#', '')
    if (!hash) return
    const target = document.getElementById(hash)
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

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
          <SettingsTabs me={me} />
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

      <div className="space-y-8 pt-2">
        <SettingsSection
          id="profile"
          title="Profile"
          description="Your personal details for this church workspace."
        >
          <SettingsFieldGrid columns={3}>
            <SettingsField label="Name" value={me.name ?? '—'} />
            <SettingsField label="Email" value={me.email ?? '—'} />
            <SettingsField label="Role" value={me.role} />
            {me.churchName ? <SettingsField label="Church" value={me.churchName} /> : null}
            {me.countryCode && me.defaultCurrency ? (
              <SettingsField label="Locale" value={`${me.countryCode} · ${me.defaultCurrency}`} />
            ) : null}
          </SettingsFieldGrid>
        </SettingsSection>

        <SettingsSection
          id="notifications"
          title="Notifications"
          description="How you hear about approvals, giving updates, and calendar events."
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <SettingsPanel>
              <p className="text-sm text-muted-foreground">
                Use the bell icon in the top bar for real-time alerts from your team.
              </p>
            </SettingsPanel>
            <SettingsPanel>
              <p className="text-sm font-medium">In-app alerts</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Enabled for your role. Email and push preferences are coming soon.
              </p>
              <Button variant="outline" size="sm" className="mt-4" disabled>
                Manage preferences (soon)
              </Button>
            </SettingsPanel>
          </div>
        </SettingsSection>

        <SettingsSection
          id="security"
          title="Security"
          description="Keep your account secure on new devices."
        >
          <SettingsPanel className="max-w-xl">
            <p className="text-sm text-muted-foreground">
              Reset your password via email if you need to sign in on a new device or update your
              credentials.
            </p>
            <Button asChild variant="outline" size="sm" className="mt-4">
              <Link to="/forgot-password">Reset password</Link>
            </Button>
          </SettingsPanel>
        </SettingsSection>
      </div>
    </div>
  )
}
