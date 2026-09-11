import { NavLink } from 'react-router-dom'
import { cn } from '@/shared/lib/utils'
import { canManageChurch, type Me } from '@/api/auth'

const PERSONAL_TABS = [
  { to: '/settings/profile', label: 'Profile', end: true },
  { to: '/settings/security', label: 'Security', end: true },
  { to: '/settings/notifications', label: 'Notifications', end: true },
] as const

const MANAGER_TABS = [
  ...PERSONAL_TABS,
  { to: '/settings/administrators', label: 'Administrators', end: true },
] as const

export function SettingsTabs({ me }: { me: Me & { onboarded: true } }) {
  const tabs = canManageChurch(me.role) ? MANAGER_TABS : PERSONAL_TABS

  return (
    <div className="border-b border-border/60">
      <nav aria-label="Settings sections" className="-mb-px flex gap-1 overflow-x-auto">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              cn(
                'shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors sm:px-4',
                isActive
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground',
              )
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
