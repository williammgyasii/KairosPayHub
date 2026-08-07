import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import type { Me } from '@/api/me'
import { AppSidebar, MobileSidebarOverlay } from '@/components/layout/app-sidebar'
import { DashboardTopbar } from '@/components/layout/dashboard-topbar'
import { SidebarProvider, useSidebar } from '@/components/layout/sidebar-context'
import { TooltipProvider } from '@/components/ui/tooltip'

const PAGE_META: Record<string, { title: string; description?: string }> = {
  '/': {
    title: 'Overview',
    description: 'Church snapshot and quick stats.',
  },
  '/structure': {
    title: 'Structure',
    description: 'Manage PFCCs, fellowships, cells, and members.',
  },
  '/programs': {
    title: 'Programs',
    description: 'Giving programs and campaigns.',
  },
  '/settings': {
    title: 'Settings',
    description: 'Church and account settings.',
  },
}

interface DashboardLayoutProps {
  me: Me & { onboarded: true }
  reloadMe: () => Promise<void>
}

function DashboardLayoutInner({ me, reloadMe }: DashboardLayoutProps) {
  const { pathname } = useLocation()
  const { mobileOpen, setMobileOpen } = useSidebar()
  const meta = PAGE_META[pathname] ?? PAGE_META['/']

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname, setMobileOpen])

  return (
    <div className="flex min-h-screen bg-muted/20">
      <div className="hidden lg:block">
        <div className="fixed inset-y-0 left-0 z-40">
          <AppSidebar me={me} />
        </div>
      </div>

      <MobileSidebarOverlay me={me} open={mobileOpen} onClose={() => setMobileOpen(false)} />

      <div className="flex min-h-screen flex-1 flex-col lg:pl-[var(--sidebar-width)] transition-[padding] duration-200">
        <SidebarWidthSync />
        <DashboardTopbar me={me} title={meta.title} description={meta.description} />
        <main className="flex-1 p-4 sm:p-6">
          <div className="mx-auto max-w-6xl">
            <Outlet context={{ me, reloadMe } satisfies DashboardOutletContext} />
          </div>
        </main>
      </div>
    </div>
  )
}

function SidebarWidthSync() {
  const { collapsed } = useSidebar()
  return (
    <style>
      {`:root { --sidebar-width: ${collapsed ? '72px' : '256px'}; }`}
    </style>
  )
}

export function DashboardLayout({ me, reloadMe }: DashboardLayoutProps) {
  return (
    <SidebarProvider>
      <TooltipProvider>
        <DashboardLayoutInner me={me} reloadMe={reloadMe} />
      </TooltipProvider>
    </SidebarProvider>
  )
}

export type DashboardOutletContext = {
  me: Me & { onboarded: true }
  reloadMe: () => Promise<void>
}
