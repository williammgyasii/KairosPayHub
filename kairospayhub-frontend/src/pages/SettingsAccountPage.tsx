import { useOutletContext } from 'react-router-dom'
import type { DashboardOutletContext } from '@/components/layout/dashboard-layout'
import { DashboardPageHeader } from '@/components/layout/dashboard-page-header'
import { Button } from '@/components/ui/button'

export function SettingsAccountPage() {
  const { me } = useOutletContext<DashboardOutletContext>()

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        breadcrumbs={[
          { label: 'Dashboard', to: '/' },
          { label: 'Settings', to: '/settings' },
          { label: 'Account' },
        ]}
        title="Account"
        description="Your login details for this church."
      />

      <dl className="space-y-3 text-sm">
        <div>
          <dt className="text-muted-foreground">Name</dt>
          <dd className="font-medium">{me.name ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Email</dt>
          <dd className="font-medium">{me.email ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Role</dt>
          <dd className="font-medium">{me.role}</dd>
        </div>
      </dl>

      <Button variant="outline" disabled>
        Change password (soon)
      </Button>
    </div>
  )
}
