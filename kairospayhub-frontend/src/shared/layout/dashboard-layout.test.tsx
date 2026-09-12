import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Me } from '@/api/auth'
import { DashboardLayout } from '@/shared/layout/dashboard-layout'

vi.mock('@/auth/AuthContext', () => ({
  useAuth: () => ({
    status: 'authed' as const,
    email: 'p@example.com',
    emailConfirmed: true,
    signIn: vi.fn(),
    markEmailConfirmed: vi.fn(),
    signOut: vi.fn(),
  }),
}))

vi.mock('@/shared/layout/notifications-bell', () => ({
  NotificationsBell: () => <button type="button" aria-label="Notifications" />,
}))

vi.mock('@/shared/layout/notifications-realtime', () => ({
  NotificationsRealtime: () => null,
}))

vi.mock('@/shared/layout/app-sidebar', () => ({
  AppSidebar: () => <aside data-testid="desktop-sidebar">Sidebar</aside>,
  MobileSidebarOverlay: () => null,
}))

const pastor: Me & { onboarded: true } = {
  onboarded: true,
  id: 'u1',
  churchId: 'c1',
  churchName: 'Grace Assembly',
  churchLogoUrl: null,
  organizationId: 'o1',
  role: 'Pastor',
  legacyChurchId: null,
  email: 'p@example.com',
  name: 'Pastor Paul',
}

describe('DashboardLayout mobile chrome', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem: () => null,
        setItem: () => undefined,
        removeItem: () => undefined,
      },
    })
  })

  it('keeps the sidebar for desktop and the tab bar for viewports below lg', () => {
    render(
      <MemoryRouter>
        <Routes>
          <Route path="/" element={<DashboardLayout me={pastor} reloadMe={async () => undefined} />}>
            <Route index element={<p>dashboard</p>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByTestId('desktop-sidebar').closest('.hidden')).toBeTruthy()
    expect(screen.getByRole('navigation', { name: 'Primary' }).className).toMatch(/lg:hidden/)
    expect(screen.queryByRole('button', { name: 'Open menu' })).toBeNull()
    expect(screen.getByRole('link', { name: 'Home' })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Notifications/i })).toBeTruthy()
  })
})
