import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import type { StructureLayer, StructureLayerType, StructureTree } from '@/api/structure'
import { RosterView } from '@/components/structure/roster-view'

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

function tree(layers: StructureLayer[]): StructureTree {
  return {
    churchId: 'church-1',
    churchName: 'Test Church',
    template: { id: 'tpl-1', name: 'Test', layers },
    nodes: [],
    members: [],
  }
}

function renderRoster(structure: StructureTree) {
  return render(
    <MemoryRouter>
      <RosterView
        tree={structure}
        error={null}
        busy={false}
        submit={async (action) => {
          await action()
        }}
      />
    </MemoryRouter>,
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
    expect(screen.getByTitle('First cell')).toBeTruthy()
  })
})
