import { describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom'
import type { AccessGrid } from '@/features/access/api'
import type { Me } from '@/api/auth'
import { PastorOnlyRoute } from '@/auth/PastorRoute'
import { PRODUCT_ABILITIES } from '@/shared/lib/abilities'
import { AccessPage } from '@/features/access'

const api = vi.hoisted(() => ({
  get: vi.fn(),
  put: vi.fn(),
}))

vi.mock('@/shared/api', () => ({
  useApi: () => api,
}))

vi.mock('react-redux', () => ({
  useDispatch: () => vi.fn(),
}))

function pastor(): Me & { onboarded: true } {
  return {
    onboarded: true,
    id: 'p1',
    churchId: 'c1',
    churchName: 'Hilltop',
    churchLogoUrl: null,
    organizationId: 'o1',
    role: 'Pastor',
    legacyChurchId: null,
    email: 'pastor@example.com',
    name: 'Pastor',
    abilities: ['createChildUnits'],
  }
}

function renderAtAccess(me: Me & { onboarded: true }) {
  return render(
    <MemoryRouter initialEntries={['/access']}>
      <Routes>
        <Route element={<Outlet context={{ me }} />}>
          <Route
            path="access"
            element={
              <PastorOnlyRoute>
                <h1>Access grid</h1>
              </PastorOnlyRoute>
            }
          />
          <Route index element={<p>Home</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('Access route', () => {
  it('shows the grid for a pastor', () => {
    renderAtAccess(pastor())
    expect(screen.getByRole('heading', { name: 'Access grid' })).toBeTruthy()
  })

  it('hides the grid from an administrator', () => {
    renderAtAccess({ ...pastor(), role: 'ChurchAdmin', id: 'a1' })
    expect(screen.queryByRole('heading', { name: 'Access grid' })).toBeNull()
    expect(screen.getByText('Home')).toBeTruthy()
  })
})

function sampleGrid(): AccessGrid {
  const abilities = [
    { id: PRODUCT_ABILITIES.createSubCampaign, label: 'Create sub-campaign' },
    { id: PRODUCT_ABILITIES.manageRoster, label: 'Manage members' },
    { id: PRODUCT_ABILITIES.viewMemberGivings, label: 'View member givings' },
    { id: PRODUCT_ABILITIES.createChildUnits, label: 'Create child units' },
    { id: PRODUCT_ABILITIES.logGiving, label: 'Log giving' },
    { id: PRODUCT_ABILITIES.approveGiving, label: 'Approve giving' },
    { id: PRODUCT_ABILITIES.viewOverallGivings, label: 'View overall givings' },
    { id: PRODUCT_ABILITIES.createCampaign, label: 'Create campaign' },
  ]
  const cells = abilities.map((ability) => ({
    ability: ability.id,
    defaultOn: ability.id !== PRODUCT_ABILITIES.createChildUnits,
    effectiveOn: ability.id !== PRODUCT_ABILITIES.createChildUnits,
    locked: ability.id === PRODUCT_ABILITIES.createChildUnits,
  }))
  return {
    abilities,
    rows: [
      { subjectKind: 'layer', subjectId: 'cell', label: 'Home group', cells },
      { subjectKind: 'adminProfile', subjectId: null, label: 'Administrators', cells },
    ],
  }
}

describe('Access page groups', () => {
  it('lists subjects in a sidebar and shows one level at a time', async () => {
    api.get.mockResolvedValue(sampleGrid())

    render(
      <MemoryRouter>
        <AccessPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByRole('navigation', { name: 'Access subjects' })).toBeTruthy()
    })
    expect(screen.getByRole('button', { name: 'Home group' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Administrators' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Home group' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Units' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Roster' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Records' })).toBeTruthy()
    expect(screen.getByRole('switch', { name: 'Home group manageRoster' })).toBeTruthy()
    expect(screen.queryByRole('switch', { name: 'Administrators manageRoster' })).toBeNull()

    await userEvent.click(screen.getByRole('button', { name: 'Administrators' }))
    expect(screen.getByRole('heading', { name: 'Administrators' })).toBeTruthy()
    expect(screen.getByRole('switch', { name: 'Administrators manageRoster' })).toBeTruthy()
    expect(screen.queryByRole('switch', { name: 'Home group manageRoster' })).toBeNull()
  })
})
