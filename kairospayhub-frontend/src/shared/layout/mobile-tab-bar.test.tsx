import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import type { Me } from '@/api/auth'
import { navForRole } from '@/shared/lib/dashboard-nav'
import { MobileTabBar } from '@/shared/layout/mobile-tab-bar'

function me(
  role: Extract<Me, { onboarded: true }>['role'],
  extra: Partial<Extract<Me, { onboarded: true }>> = {},
): Me & { onboarded: true } {
  return {
    onboarded: true,
    id: 'u1',
    churchId: 'c1',
    churchName: 'Grace',
    churchLogoUrl: null,
    organizationId: 'o1',
    role,
    legacyChurchId: null,
    email: 'a@example.com',
    name: 'Ada',
    ...extra,
  }
}

function renderBar(role: Extract<Me, { onboarded: true }>['role'] = 'Pastor', path = '/') {
  const entries = navForRole(me(role, role === 'CellLeader' ? { canMarkAttendance: true } : {}))
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/"
          element={
            <>
              <MobileTabBar entries={entries} />
              <Outlet />
            </>
          }
        >
          <Route index element={<p>home page</p>} />
          <Route path="attendance" element={<p>attendance landing</p>} />
          <Route path="attendance/submissions" element={<p>mark attendance</p>} />
          <Route path="givings" element={<p>givings page</p>} />
          <Route path="settings" element={<p>settings page</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('MobileTabBar', () => {
  it('navigates to the role’s Attendance landing', async () => {
    const user = userEvent.setup()
    renderBar('Pastor')

    await user.click(screen.getByRole('link', { name: 'Attendance' }))
    expect(screen.getByText('attendance landing')).toBeTruthy()
  })

  it('lists leftover destinations in More and not promoted tabs', async () => {
    const user = userEvent.setup()
    renderBar('Pastor')

    expect(screen.queryByRole('link', { name: 'Bell' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'You' })).toBeNull()

    await user.click(screen.getByRole('button', { name: 'More' }))
    const sheet = screen.getByRole('dialog', { name: 'More' })
    expect(sheet.textContent).toMatch(/Structure/)
    expect(sheet.textContent).toMatch(/Settings/)
    expect(sheet.textContent).toMatch(/Membership/)
    expect(sheet.textContent).not.toMatch(/Home/)
    expect(sheet.textContent).not.toMatch(/Units/)
    expect(sheet.textContent).not.toMatch(/Campaigns/)
  })

  it('lifts the middle tab so it stands out', () => {
    renderBar('Pastor')
    expect(screen.getByRole('link', { name: 'Givings' }).getAttribute('data-emphasized')).toBe(
      'true',
    )
    expect(screen.getByRole('link', { name: 'Home' }).getAttribute('data-emphasized')).toBeNull()
  })

  it('navigates to Settings from More and closes the sheet', async () => {
    const user = userEvent.setup()
    renderBar('Pastor')

    await user.click(screen.getByRole('button', { name: 'More' }))
    await user.click(screen.getByRole('link', { name: 'Settings' }))
    expect(screen.getByText('settings page')).toBeTruthy()
    expect(screen.queryByRole('dialog', { name: 'More' })).toBeNull()
  })
})
