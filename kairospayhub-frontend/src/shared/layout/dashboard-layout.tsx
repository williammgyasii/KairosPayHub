import { Outlet } from 'react-router-dom'
import { canManageChurch, type Me } from '@/api/auth'
import { ServiceRecordingUploadQueueProvider } from '@/features/media/lib/service-recording-upload-queue'
import { serviceRecordingsVisible } from '@/features/media/lib/service-recording-feature-policy'
import { AppSidebar } from '@/shared/layout/app-sidebar'
import { DashboardTopbar } from '@/shared/layout/dashboard-topbar'
import { MobileTabBar } from '@/shared/layout/mobile-tab-bar'
import { NotificationsRealtime } from '@/shared/layout/notifications-realtime'
import { SidebarProvider, useSidebar } from '@/shared/layout/sidebar-context'
import { navForRole } from '@/shared/lib/dashboard-nav'
import { TooltipProvider } from '@/shared/ui/tooltip'
import { AbilityProvider } from '@/auth/AbilityProvider'

interface DashboardLayoutProps {
  me: Me & { onboarded: true }
  reloadMe: () => Promise<void>
}

function DashboardLayoutInner({
  me,
  reloadMe,
  showRecordingUploads,
}: DashboardLayoutProps & { showRecordingUploads: boolean }) {
  const nav = navForRole(me)

  return (
    <div className="flex min-h-screen bg-muted/20">
      <div className="hidden lg:block">
        <div className="fixed inset-y-0 left-0 z-40">
          <AppSidebar me={me} />
        </div>
      </div>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col pb-[calc(5rem+env(safe-area-inset-bottom))] transition-[padding] duration-200 lg:pb-0 lg:pl-[var(--sidebar-width)]">
        <SidebarWidthSync />
        <NotificationsRealtime />
        <DashboardTopbar me={me} showRecordingUploads={showRecordingUploads} />
        <main className="flex min-h-0 min-w-0 flex-1 flex-col px-4 py-5 sm:px-6 sm:py-6">
          <Outlet context={{ me, reloadMe } satisfies DashboardOutletContext} />
        </main>
      </div>

      <MobileTabBar entries={nav} />
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
  const recordingsVisible = serviceRecordingsVisible(me)
  const showRecordingUploads = recordingsVisible && canManageChurch(me.role)

  const layout = (
    <DashboardLayoutInner
      me={me}
      reloadMe={reloadMe}
      showRecordingUploads={showRecordingUploads}
    />
  )

  return (
    <AbilityProvider me={me}>
      <SidebarProvider>
        <TooltipProvider>
          {recordingsVisible ? (
            <ServiceRecordingUploadQueueProvider>{layout}</ServiceRecordingUploadQueueProvider>
          ) : (
            layout
          )}
        </TooltipProvider>
      </SidebarProvider>
    </AbilityProvider>
  )
}

export type DashboardOutletContext = {
  me: Me & { onboarded: true }
  reloadMe: () => Promise<void>
}
