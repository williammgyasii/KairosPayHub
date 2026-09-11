import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom'
import type { Me } from '@/api/auth'
import { AccountProfilePage } from '@/pages/AccountProfilePage'

const reloadMe = vi.fn(async () => undefined)
const patchMe = vi.fn()

vi.mock('@/store/meApi', () => ({
  usePatchMeMutation: () => [patchMe, { isLoading: false }],
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

const pastor: Me & { onboarded: true } = {
  onboarded: true,
  id: 'u1',
  churchId: 'c1',
  churchName: 'TPH USA',
  churchLogoUrl: 'https://cdn.example.com/logo.png',
  defaultCurrency: 'USD',
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

function renderProfile(me: Me & { onboarded: true }) {
  function Shell() {
    return <Outlet context={{ me, reloadMe }} />
  }

  return render(
    <MemoryRouter initialEntries={['/settings/profile']}>
      <Routes>
        <Route element={<Shell />}>
          <Route path="settings/profile" element={<AccountProfilePage />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('Church section on Profile', () => {
  beforeEach(() => {
    reloadMe.mockClear()
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ ok: true, logoUrl: 'https://cdn.example.com/logo-new.png' }),
      })),
    )
  })

  it('shows church fields in a profile-style grid for managers', () => {
    renderProfile(pastor)

    expect(screen.getByText('Church name')).toBeTruthy()
    expect(screen.getAllByText('TPH USA').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByDisplayValue('USD')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Edit church' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Change logo' })).toBeTruthy()
    expect(screen.getByTestId('church-logo-preview')).toBeTruthy()
  })

  it('hides church section for non–church-managers', () => {
    renderProfile(cellLeader)

    expect(screen.queryByRole('button', { name: 'Edit church' })).toBeNull()
    expect(screen.queryByTestId('church-logo-preview')).toBeNull()
  })

  it('edits and saves church name', async () => {
    renderProfile(pastor)
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'Edit church' }))
    const nameInput = screen.getByLabelText('Church name')
    await user.clear(nameInput)
    await user.type(nameInput, 'Renamed Church')
    await user.click(screen.getByRole('button', { name: 'Save church' }))

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/church'),
        expect.objectContaining({ method: 'PATCH' }),
      )
      expect(reloadMe).toHaveBeenCalled()
    })
  })
})
