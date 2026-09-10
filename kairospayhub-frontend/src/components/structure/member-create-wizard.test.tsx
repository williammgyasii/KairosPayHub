import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom'
import type { Me } from '@/api/auth'
import type { StructureLayer, StructureLayerType, StructureNode, StructureTree } from '@/api/structure'
import { MemberCreateWizard } from '@/components/structure/member-create-wizard'

vi.mock('@/api/core', () => ({
  useApi: () => ({
    post: vi.fn(),
    get: vi.fn(),
  }),
}))

const me: Me & { onboarded: true } = {
  onboarded: true,
  id: 'u1',
  churchId: 'c1',
  churchName: 'TPH USA',
  churchLogoUrl: null,
  organizationId: 'o1',
  role: 'CellLeader',
  legacyChurchId: null,
  email: 'lead@example.com',
  name: 'Cell Lead',
  countryCode: 'US',
}

function layer(
  id: string,
  sortOrder: number,
  displayName: string,
  standardType: StructureLayerType,
): StructureLayer {
  return { id, sortOrder, displayName, standardType }
}

function node(
  id: string,
  layerId: string,
  parentNodeId: string | null,
  name: string,
): StructureNode {
  return {
    id,
    layerId,
    parentNodeId,
    name,
    unitNumber: '1',
    leaderMemberId: null,
    leaderName: null,
  }
}

function cellTree(): StructureTree {
  const cell = layer('cell', 0, 'Cell', 'Cell')
  return {
    churchId: 'c1',
    churchName: 'TPH USA',
    template: { id: 'tpl', name: 'Main', layers: [cell] },
    nodes: [node('n1', 'cell', null, 'Zion 1')],
    members: [],
  }
}

function renderWizard() {
  function Shell() {
    return <Outlet context={{ me, reloadMe: async () => undefined }} />
  }

  return render(
    <MemoryRouter>
      <Routes>
        <Route element={<Shell />}>
          <Route
            path="/"
            element={
              <MemberCreateWizard
                tree={cellTree()}
                unitNodeId="n1"
                busy={false}
                submit={async (action) => {
                  await action()
                }}
                onClose={() => undefined}
              />
            }
          />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('MemberCreateWizard', () => {
  it('skips new-to-church, leaves email optional, and requires birthday on the next step', async () => {
    const user = userEvent.setup()
    renderWizard()

    expect(screen.queryByText(/new to the church/i)).toBeNull()
    expect(screen.getByLabelText('Country code')).toHaveTextContent('+1')
    expect(screen.getByRole('heading', { name: 'Add member' })).toBeTruthy()
    expect(screen.getByText('Details')).toBeTruthy()
    expect(screen.getByLabelText('Step 1 of 3')).toBeTruthy()
    expect(screen.queryByText(/step 3 of 3/i)).toBeNull()

    const nameInput = document.getElementById('member-name')
    expect(nameInput).toBeTruthy()
    await user.type(nameInput!, 'Ama Boateng')
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    expect(screen.getByText(/birthday is required/i)).toBeTruthy()
    expect(screen.getByRole('button', { name: /date of birth/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled()
  })
})
