import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom'
import type { Me } from '@/api/auth'
import type { ChurchAdministrator } from '@/features/settings/api'
import { SettingsAdministratorsPage } from '@/features/settings'

const listAdministrators = vi.fn()
const createAdministrator = vi.fn()
const deactivateAdministrator = vi.fn()
const suggestAdminEmail = vi.fn()

vi.mock('@/shared/api', () => ({
  useApi: () => ({}),
}))

vi.mock('@/features/settings/api', async () => {
  const actual = await vi.importActual<typeof import('@/features/settings/api')>('@/features/settings/api')
  return {
    ...actual,
    listAdministrators: (...args: unknown[]) => listAdministrators(...args),
    createAdministrator: (...args: unknown[]) => createAdministrator(...args),
    deactivateAdministrator: (...args: unknown[]) => deactivateAdministrator(...args),
    suggestAdminEmail: (...args: unknown[]) => suggestAdminEmail(...args),
  }
})

vi.mock('@/shared/ui/email-availability-field', () => ({
  useEmailAvailability: () => ({ status: 'available' as const }),
  isEmailAvailabilityBlocking: () => false,
  EmailAvailabilityField: ({
    email,
    onChange,
    id,
    label,
  }: {
    email: string
    onChange: (v: string) => void
    id?: string
    label?: string
  }) => (
    <div>
      <label htmlFor={id}>{label}</label>
      <input id={id} value={email} onChange={(e) => onChange(e.target.value)} />
    </div>
  ),
}))

const pastor: Me & { onboarded: true } = {
  onboarded: true,
  id: 'u1',
  churchId: 'c1',
  churchName: 'TPH',
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

const admins: ChurchAdministrator[] = [
  {
    id: 'a1',
    firstName: 'Mary',
    lastName: 'Admin',
    email: 'mary@example.com',
    affiliationKind: 'External',
    memberId: null,
    memberName: null,
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'a2',
    firstName: 'Old',
    lastName: 'Admin',
    email: 'old@example.com',
    affiliationKind: 'External',
    memberId: null,
    memberName: null,
    isActive: false,
    createdAt: '2026-01-01T00:00:00Z',
  },
]

function renderPage() {
  function Shell() {
    return <Outlet context={{ me: pastor, reloadMe: async () => undefined }} />
  }

  return render(
    <MemoryRouter initialEntries={['/settings/administrators']}>
      <Routes>
        <Route element={<Shell />}>
          <Route path="settings/administrators" element={<SettingsAdministratorsPage />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('SettingsAdministratorsPage', () => {
  beforeEach(() => {
    listAdministrators.mockReset()
    listAdministrators.mockResolvedValue(admins)
    createAdministrator.mockReset()
    deactivateAdministrator.mockReset()
    suggestAdminEmail.mockReset()
  })

  it('puts the add form above an expanded administrators table', async () => {
    renderPage()

    expect(await screen.findByRole('button', { name: 'Create administrator' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Add administrator' })).toBeTruthy()

    const addHeading = screen.getByRole('heading', { name: 'Add administrator' })
    const listToggle = screen.getByRole('button', { name: /Administrators/i })
    expect(addHeading.compareDocumentPosition(listToggle) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

    expect(screen.getByText('Mary Admin')).toBeTruthy()
    expect(screen.getByText('Old Admin')).toBeTruthy()
    expect(screen.getByText('Active')).toBeTruthy()
    expect(screen.getByText('Disabled')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Disable' })).toBeTruthy()
  })

  it('collapses the administrators table', async () => {
    renderPage()
    await screen.findByText('Mary Admin')
    const user = userEvent.setup()

    await user.click(
      screen.getByRole('button', { name: /Administrators People with church admin access/i }),
    )

    expect(screen.queryByText('Mary Admin')).toBeNull()
  })
})
