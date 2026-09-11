import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import type { Me } from '@/api/auth'
import { SettingsTabs } from '@/features/settings/components/settings-tabs'
import { SettingsLayout } from '@/features/settings/components/settings-layout'

const pastor: Me & { onboarded: true } = {
  onboarded: true,
  id: 'u1',
  churchId: 'c1',
  churchName: 'TPH USA',
  churchLogoUrl: null,
  organizationId: 'o1',
  role: 'Pastor',
  legacyChurchId: null,
  email: 'pastor@example.com',
  name: 'Pastor',
  memberId: 'm1',
  phone: null,
  dateOfBirth: null,
  residence: null,
  occupationStatus: null,
  schoolOrWorkplace: null,
}

const cellLeader: Me & { onboarded: true } = {
  ...pastor,
  role: 'CellLeader',
  email: 'cell@example.com',
  name: 'Cell Leader',
}

function renderWithRedirects(me: Me & { onboarded: true }, path: string) {
  function Shell() {
    return <Outlet context={{ me, reloadMe: async () => undefined }} />
  }

  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<Shell />}>
          <Route path="settings" element={<SettingsLayout />}>
            <Route index element={<Navigate to="/settings/profile" replace />} />
            <Route path="profile" element={<div>Profile page</div>} />
            <Route path="security" element={<div>Security page</div>} />
            <Route path="notifications" element={<div>Notifications page</div>} />
            <Route path="administrators" element={<div>Administrators page</div>} />
          </Route>
          <Route path="account" element={<Navigate to="/settings/profile" replace />} />
          <Route path="account/security" element={<Navigate to="/settings/security" replace />} />
          <Route
            path="account/notifications"
            element={<Navigate to="/settings/notifications" replace />}
          />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('Settings navigation', () => {
  it('shows flat manager tabs with Profile first (no separate Church profile tab)', () => {
    render(
      <MemoryRouter initialEntries={['/settings/profile']}>
        <SettingsTabs me={pastor} />
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: 'Profile' })).toHaveAttribute(
      'href',
      '/settings/profile',
    )
    expect(screen.getByRole('link', { name: 'Security' })).toHaveAttribute(
      'href',
      '/settings/security',
    )
    expect(screen.getByRole('link', { name: 'Notifications' })).toHaveAttribute(
      'href',
      '/settings/notifications',
    )
    expect(screen.getByRole('link', { name: 'Administrators' })).toHaveAttribute(
      'href',
      '/settings/administrators',
    )
    expect(screen.queryByRole('link', { name: 'Church profile' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Branding' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Account' })).toBeNull()
  })

  it('shows only personal tabs for non–church-managers', () => {
    render(
      <MemoryRouter initialEntries={['/settings/profile']}>
        <SettingsTabs me={cellLeader} />
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: 'Profile' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Security' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Notifications' })).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Administrators' })).toBeNull()
  })

  it('redirects legacy /account paths and settings index to profile', () => {
    const { unmount } = renderWithRedirects(cellLeader, '/account')
    expect(screen.getByText('Profile page')).toBeTruthy()
    unmount()

    const root = renderWithRedirects(pastor, '/settings')
    expect(screen.getByText('Profile page')).toBeTruthy()
    root.unmount()

    const sec = renderWithRedirects(cellLeader, '/account/security')
    expect(screen.getByText('Security page')).toBeTruthy()
    sec.unmount()

    renderWithRedirects(cellLeader, '/account/notifications')
    expect(screen.getByText('Notifications page')).toBeTruthy()
  })
})
