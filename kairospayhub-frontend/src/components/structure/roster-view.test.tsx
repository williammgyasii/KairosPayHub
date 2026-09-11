import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { MemoryRouter } from 'react-router-dom'
import type { StructureLayer, StructureLayerType, StructureTree } from '@/api/structure'
import { RosterView } from '@/components/structure/roster-view'
import { baseApi } from '@/store/baseApi'
import '@/store/meApi'

vi.mock('@/api/core', () => ({
  useApi: () => ({
    post: vi.fn(),
    delete: vi.fn(),
    get: vi.fn(),
  }),
}))

function layer(
  id: string,
  sortOrder: number,
  displayName: string,
  standardType: StructureLayerType,
): StructureLayer {
  return { id, sortOrder, displayName, standardType }
}

function tree(
  layers: StructureLayer[],
  nodes: StructureTree['nodes'] = [],
): StructureTree {
  return {
    churchId: 'church-1',
    churchName: 'Test Church',
    template: { id: 'tpl-1', name: 'Test', layers },
    nodes,
    members: [],
  }
}

function renderRoster(structure: StructureTree) {
  const store = configureStore({
    reducer: { [baseApi.reducerPath]: baseApi.reducer },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(baseApi.middleware),
  })
  return render(
    <Provider store={store}>
      <MemoryRouter>
        <RosterView
          tree={structure}
          error={null}
          busy={false}
          submit={async (action) => {
            await action()
          }}
        />
      </MemoryRouter>
    </Provider>,
  )
}

describe('RosterView add unit', () => {
  it('opens the create-unit modal when adding a cell on Church → Cell', async () => {
    const user = userEvent.setup()
    renderRoster(tree([layer('cell', 0, 'Cell', 'Cell')]))

    await user.click(screen.getByRole('button', { name: /add new cell/i }))

    expect(screen.getByTestId('unit-create-wizard')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Add cell' })).toBeTruthy()
    expect(screen.queryByText('First cell')).toBeNull()
  })

  it('opens the same create-unit modal when adding a fellowship', async () => {
    const user = userEvent.setup()
    renderRoster(
      tree([
        layer('fel', 0, 'Fellowship', 'Fellowship'),
        layer('cell', 1, 'Cell', 'Cell'),
      ]),
    )

    await user.click(screen.getByRole('button', { name: /add new fellowship/i }))

    expect(screen.getByTestId('unit-create-wizard')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Add fellowship' })).toBeTruthy()
    expect(screen.queryByText('First cell')).toBeNull()
  })
})

describe('RosterView units columns', () => {
  const fellowshipCell = [
    layer('fel', 0, 'Fellowship', 'Fellowship'),
    layer('cell', 1, 'Cell', 'Cell'),
  ]
  const units = [
    {
      id: 'f1',
      layerId: 'fel',
      parentNodeId: null,
      name: 'Titans Fellowship',
      unitNumber: '1',
      leaderMemberId: null,
      leaderName: null,
    },
    {
      id: 'c1',
      layerId: 'cell',
      parentNodeId: 'f1',
      name: 'Alpha Cell',
      unitNumber: '1',
      leaderMemberId: null,
      leaderName: null,
    },
  ]

  it('shows Name, Parent, and Members by default and Name stays always on', async () => {
    const user = userEvent.setup()
    renderRoster(tree(fellowshipCell, units))

    expect(screen.getByRole('columnheader', { name: /name/i })).toBeTruthy()
    expect(screen.getByRole('columnheader', { name: /parent/i })).toBeTruthy()
    expect(screen.getByRole('columnheader', { name: /members/i })).toBeTruthy()
    expect(screen.getByText('Titans Fellowship')).toBeTruthy()

    await user.click(screen.getByRole('button', { name: /columns/i }))
    expect(screen.getByRole('menuitem', { name: /^name$/i })).toHaveAttribute('aria-disabled', 'true')
  })

  it('hides Parent without changing which units are listed', async () => {
    const user = userEvent.setup()
    renderRoster(tree(fellowshipCell, units))

    await user.click(screen.getByRole('button', { name: /columns/i }))
    await user.click(screen.getByRole('menuitem', { name: /^parent$/i }))

    expect(screen.queryByRole('columnheader', { name: /parent/i })).toBeNull()
    expect(screen.getByText('Titans Fellowship')).toBeTruthy()
  })
})
