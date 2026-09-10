import { Bell, Shield, UserRound } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'

const TABS = [
  { to: '/account', label: 'Profile', end: true, icon: UserRound },
  { to: '/account/security', label: 'Security', end: true, icon: Shield },
  { to: '/account/notifications', label: 'Notifications', end: true, icon: Bell },
] as const

export function AccountTabs() {
  return (
    <div className="border-b border-border/60">
      <nav aria-label="Account sections" className="-mb-px flex gap-1 overflow-x-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                cn(
                  'inline-flex shrink-0 items-center gap-1.5 border-b-2 px-2.5 py-2.5 text-sm font-medium transition-colors sm:px-4',
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground',
                )
              }
            >
              <Icon className="size-4" aria-hidden />
              {tab.label}
            </NavLink>
          )
        })}
      </nav>
    </div>
  )
}
