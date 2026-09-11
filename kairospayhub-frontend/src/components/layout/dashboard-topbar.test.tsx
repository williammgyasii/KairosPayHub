import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import type { Me } from '@/api/auth'
import { DashboardTopbar } from '@/components/layout/dashboard-topbar'

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

vi.mock('@/components/layout/sidebar-context', () => ({
  useSidebar: () => ({
    collapsed: false,
    mobileOpen: false,
    setCollapsed: vi.fn(),
    toggleCollapsed: vi.fn(),
    setMobileOpen: vi.fn(),
    toggleMobile: vi.fn(),
  }),
}))

vi.mock('@/components/layout/notifications-bell', () => ({
  NotificationsBell: () => <button type="button" aria-label="Notifications" />,
}))

const me = {
  onboarded: true as const,
  id: 'u1',
  churchId: 'c1',
  churchName: 'Grace Assembly',
  churchLogoUrl: null,
  avatarUrl: null as string | null,
  organizationId: 'o1',
  role: 'Pastor' as const,
  legacyChurchId: null,
  email: 'p@example.com',
  name: 'Pastor Paul',
} satisfies Me & { onboarded: true }

function renderTopbar(overrides?: Partial<typeof me>) {
  return render(
    <MemoryRouter>
      <DashboardTopbar me={{ ...me, ...overrides }} />
    </MemoryRouter>,
  )
}

describe('DashboardTopbar', () => {
  it('uses a taller bar and type-scale roles for identity labels', () => {
    renderTopbar()
    const header = screen.getByRole('banner')
    expect(header.className).toMatch(/\bh-16\b/)
    expect(screen.getByText('Grace Assembly').className).toMatch(/text-body/)
  })

  it('does not render a compact role badge in the topbar header', () => {
    renderTopbar()
    const header = screen.getByRole('banner')
    expect(header.querySelector('span.rounded-full.border')).toBeNull()
  })

  it('keeps role context inside the account menu', async () => {
    const user = userEvent.setup()
    renderTopbar()

    await user.click(screen.getByRole('button', { name: /Pastor Paul/i }))
    const menu = await screen.findByRole('menu')
    expect(within(menu).getByText('Pastor')).toBeTruthy()
  })

  it('marks the user avatar when me.avatarUrl is set', () => {
    renderTopbar({
      avatarUrl: 'https://cdn.example.com/users/u1/avatar.jpg',
    })
    expect(screen.getByTestId('user-avatar').getAttribute('data-has-image')).toBe('true')
  })

  it('marks the user avatar without image when avatarUrl is null', () => {
    renderTopbar({ avatarUrl: null })
    expect(screen.getByTestId('user-avatar').getAttribute('data-has-image')).toBe('false')
  })
})
