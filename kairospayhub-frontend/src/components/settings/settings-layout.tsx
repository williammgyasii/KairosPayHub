import { NavLink, Outlet, useLocation, useOutletContext } from 'react-router-dom'
import { cn } from '@/lib/utils'
import type { DashboardOutletContext } from '@/components/layout/dashboard-layout'

const SETTINGS_LINKS = [
  { to: '/settings', label: 'Branding' },
  { to: '/settings/account', label: 'Account' },
  { to: '/settings/administrators', label: 'Administrators' },
] as const

export function SettingsLayout() {
  const context = useOutletContext<DashboardOutletContext>()
  const { pathname } = useLocation()

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
      <nav className="shrink-0 lg:w-52">
        <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Settings
        </p>
        <ul className="space-y-0.5">
          {SETTINGS_LINKS.map((link) => {
            const active = pathname === link.to
            return (
              <li key={link.to}>
                <NavLink
                  to={link.to}
                  end
                  className={cn(
                    'block rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    active
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-accent/80 hover:text-foreground',
                  )}
                >
                  {link.label}
                </NavLink>
              </li>
            )
          })}
        </ul>
      </nav>
      <div className="min-w-0 flex-1">
        <Outlet context={context} />
      </div>
    </div>
  )
}
