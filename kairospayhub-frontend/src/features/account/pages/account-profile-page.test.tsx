import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom'
import type { Me } from '@/api/auth'
import { SettingsLayout } from '@/features/settings/components/settings-layout'
import { AccountNotificationsPage } from '@/features/account'
import { AccountProfilePage } from '@/features/account'
import { AccountSecurityPage } from '@/features/account'

const patchMe = vi.fn()
const toastSuccess = vi.fn()

vi.mock('@/store/meApi', () => ({
  usePatchMeMutation: () => [patchMe, { isLoading: false }],
}))

vi.mock('sonner', () => ({
  toast: { success: (...args: unknown[]) => toastSuccess(...args) },
}))

const cellLeader: Me & { onboarded: true } = {
  onboarded: true,
  id: 'u1',
  churchId: 'c1',
  churchName: 'TPH USA',
  churchLogoUrl: null,
  organizationId: 'o1',
  role: 'CellLeader',
  legacyChurchId: null,
  email: 'william.cell@example.com',
  name: 'William Cell Leader',
  memberId: 'm1',
  phone: '+14437622773',
  dateOfBirth: '1994-01-15',
  residence: 'Baltimore',
  occupationStatus: 'Working',
  schoolOrWorkplace: 'Kairos',
}

function renderAccount(path = '/settings/profile') {
  function Shell() {
    return <Outlet context={{ me: cellLeader, reloadMe: async () => undefined }} />
  }

  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<Shell />}>
          <Route path="settings" element={<SettingsLayout />}>
            <Route path="profile" element={<AccountProfilePage />} />
            <Route path="security" element={<AccountSecurityPage />} />
            <Route path="notifications" element={<AccountNotificationsPage />} />
          </Route>
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('Account profile', () => {
  beforeEach(() => {
    patchMe.mockReset()
    toastSuccess.mockReset()
  })

  it('shows personal photo upload on profile', () => {
    renderAccount()

    expect(screen.getByText('Your photo')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Upload photo' })).toBeTruthy()
  })

  it('opens in view mode with Edit and read-only email', () => {
    renderAccount()

    expect(screen.getByRole('button', { name: 'Edit profile' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Save profile' })).toBeNull()
    expect(screen.getByText('William Cell Leader')).toBeTruthy()
    const email = screen.getByLabelText('Email')
    expect(email).toHaveValue('william.cell@example.com')
    expect(email).toBeDisabled()
    expect(screen.queryByRole('heading', { name: 'Profile' })).toBeNull()
    expect(screen.getByText('TPH USA')).toBeTruthy()
    expect(screen.getByText('Cell leader')).toBeTruthy()
  })

  it('enters edit mode from Edit', async () => {
    renderAccount()
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'Edit profile' }))

    expect(screen.getByLabelText('Name')).toHaveValue('William Cell Leader')
    expect(screen.getByLabelText('Date of birth')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Save profile' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy()
  })

  it('links to security and notifications pages at settings top level', () => {
    renderAccount()

    expect(screen.getByRole('link', { name: 'Security' })).toHaveAttribute(
      'href',
      '/settings/security',
    )
    expect(screen.getByRole('link', { name: 'Notifications' })).toHaveAttribute(
      'href',
      '/settings/notifications',
    )
  })

  it('saves profile without posting email and confirms', async () => {
    patchMe.mockReturnValue({ unwrap: () => Promise.resolve({}) })
    renderAccount()
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'Edit profile' }))
    await user.clear(screen.getByLabelText('Name'))
    await user.type(screen.getByLabelText('Name'), 'William Updated')
    await user.click(screen.getByRole('button', { name: 'Save profile' }))

    expect(patchMe).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'William Updated',
        dateOfBirth: '1994-01-15',
      }),
    )
    expect(patchMe.mock.calls[0][0]).not.toHaveProperty('email')
    expect(toastSuccess).toHaveBeenCalledWith('Profile saved')
    expect(screen.getByRole('button', { name: 'Edit profile' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Save profile' })).toBeNull()
  })
})
