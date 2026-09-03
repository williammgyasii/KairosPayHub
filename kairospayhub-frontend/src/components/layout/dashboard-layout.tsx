import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import type { Me } from '@/api/auth'
import { AppSidebar, MobileSidebarOverlay } from '@/components/layout/app-sidebar'
import { DashboardTopbar } from '@/components/layout/dashboard-topbar'
import { SidebarProvider, useSidebar } from '@/components/layout/sidebar-context'
import { TooltipProvider } from '@/components/ui/tooltip'

interface DashboardLayoutProps {
  me: Me & { onboarded: true }
  reloadMe: () => Promise<void>
}

function DashboardLayoutInner({ me, reloadMe }: DashboardLayoutProps) {
  const { pathname } = useLocation()
  const { mobileOpen, setMobileOpen } = useSidebar()

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

      <div className="flex min-h-screen min-w-0 flex-1 flex-col lg:pl-[var(--sidebar-width)] transition-[padding] duration-200">
        <SidebarWidthSync />
        <DashboardTopbar me={me} />
        <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 sm:py-6">
          <Outlet context={{ me, reloadMe } satisfies DashboardOutletContext} />
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
