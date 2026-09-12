import { useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  ClipboardCheck,
  HandCoins,
  Home,
  MoreHorizontal,
  UsersRound,
  X,
} from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'
import { cn } from '@/shared/lib/utils'
import type { NavEntry } from '@/shared/lib/dashboard-nav'
import { createMobileTabs, emphasizedTabIndex, type MobileTabId } from '@/shared/lib/mobile-tabs'
import { Button } from '@/shared/ui/button'

const TAB_ICONS: Record<MobileTabId, LucideIcon> = {
  home: Home,
  attendance: ClipboardCheck,
  givings: HandCoins,
  roster: UsersRound,
  more: MoreHorizontal,
}

interface MobileTabBarProps {
  entries: NavEntry[]
}

export function MobileTabBar({ entries }: MobileTabBarProps) {
  const { pathname } = useLocation()
  const { tabs, overflow } = createMobileTabs(entries, pathname)
  const [moreOpen, setMoreOpen] = useState(false)
  const standout = emphasizedTabIndex(tabs.length)

  return (
    <>
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-30 overflow-visible border-t border-border/60 bg-background/95 px-3 backdrop-blur-md supports-[backdrop-filter]:bg-background/80 lg:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <ul className="flex h-16 items-end justify-between gap-1 pb-1.5">
          {tabs.map((tab, index) => {
            const Icon = TAB_ICONS[tab.id]
            const emphasized = index === standout
            const className = cn(
              'flex min-w-0 flex-col items-center justify-end',
              emphasized
                ? '-translate-y-3 gap-1'
                : 'h-12 flex-1 gap-1 px-1',
              !emphasized && (tab.active ? 'text-primary' : 'text-muted-foreground'),
            )

            const inner = emphasized ? (
              <>
                <span
                  className={cn(
                    'flex size-14 items-center justify-center rounded-full shadow-lg ring-4 ring-background',
                    tab.active
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-primary/90 text-primary-foreground',
                  )}
                >
                  <Icon className="size-6" />
                </span>
                <span className="text-[10px] font-semibold tracking-wide text-primary">
                  {tab.label}
                </span>
              </>
            ) : (
              <>
                <Icon className="size-5 shrink-0" />
                <span className="max-w-full truncate text-[10px] font-medium tracking-wide">
                  {tab.label}
                </span>
              </>
            )

            return (
              <li
                key={tab.id}
                className={cn('flex justify-center', emphasized ? 'w-16 shrink-0' : 'min-w-0 flex-1')}
              >
                {tab.id === 'more' || !tab.to ? (
                  <button
                    type="button"
                    aria-expanded={moreOpen}
                    aria-haspopup="dialog"
                    data-emphasized={emphasized ? 'true' : undefined}
                    className={className}
                    onClick={() => setMoreOpen(true)}
                  >
                    {inner}
                  </button>
                ) : (
                  <NavLink
                    to={tab.to}
                    end={tab.id === 'home'}
                    relative="route"
                    data-emphasized={emphasized ? 'true' : undefined}
                    className={className}
                  >
                    {inner}
                  </NavLink>
                )}
              </li>
            )
          })}
        </ul>
      </nav>

      {moreOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close more"
            onClick={() => setMoreOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-more-title"
            className="absolute inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto rounded-t-2xl border-t bg-background shadow-xl"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            <header className="flex items-center justify-between gap-3 px-5 py-4">
              <h2 id="mobile-more-title" className="text-base font-semibold tracking-tight">
                More
              </h2>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 shrink-0"
                onClick={() => setMoreOpen(false)}
              >
                <X className="size-4" />
                <span className="sr-only">Close</span>
              </Button>
            </header>
            <ul className="flex flex-col gap-0.5 px-3 pb-4">
              {overflow.map((item) => {
                const Icon = item.icon
                return (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      relative="route"
                      className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-foreground hover:bg-accent"
                      onClick={() => setMoreOpen(false)}
                    >
                      <Icon className="size-4 shrink-0 text-muted-foreground" />
                      {item.label}
                    </NavLink>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      ) : null}
    </>
  )
}
