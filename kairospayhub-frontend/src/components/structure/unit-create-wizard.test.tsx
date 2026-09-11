import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { StructureLayer, StructureLayerType, StructureNode, StructureTree } from '@/api/structure'
import { UnitCreateWizard } from '@/components/structure/unit-create-wizard'

vi.mock('@/api/core', () => ({
  useApi: () => ({
    post: vi.fn(),
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

function tree(layers: StructureLayer[], nodes: StructureNode[] = []): StructureTree {
  return {
    churchId: 'church-1',
    churchName: 'Test Church',
    template: { id: 'tpl-1', name: 'Test', layers },
    nodes,
    members: [],
  }
}

function renderWizard(
  structure: StructureTree,
  createLayer: StructureLayer,
  scopeUnitId?: string,
  countryCode?: string,
) {
  return render(
    <UnitCreateWizard
      tree={structure}
      layer={createLayer}
      scopeUnitId={scopeUnitId ?? null}
      countryCode={countryCode}
      busy={false}
      submit={async (action) => {
        await action()
      }}
      onClose={() => undefined}
    />,
  )
}

describe('UnitCreateWizard', () => {
  it('opens a create-unit modal for Church → Cell without a first-child step', () => {
    const cell = layer('cell', 0, 'Cell', 'Cell')
    renderWizard(tree([cell]), cell)

    expect(screen.getByTestId('unit-create-wizard')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Add cell' })).toBeTruthy()
    expect(screen.getByText('Name & place')).toBeTruthy()
    expect(screen.getByLabelText('Step 1 of 2')).toBeTruthy()
    expect(screen.getByTitle('Cell leader')).toBeTruthy()
    expect(screen.queryByText('First cell')).toBeNull()
    expect(screen.queryByText(/which /i)).toBeNull()
  })

  it('creates a fellowship with a leader step and no first cell', () => {
    const fellowship = layer('fel', 0, 'Fellowship', 'Fellowship')
    const cell = layer('cell', 1, 'Cell', 'Cell')
    renderWizard(tree([fellowship, cell]), fellowship)

    expect(screen.getByTestId('unit-create-wizard')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Add fellowship' })).toBeTruthy()
    expect(screen.getByLabelText('Step 1 of 2')).toBeTruthy()
    expect(screen.getByTitle('Fellowship leader')).toBeTruthy()
    expect(screen.queryByTitle('First cell')).toBeNull()
  })

  it('uses the display name when the deepest layer is relabeled', () => {
    const homeGroup = layer('cell', 0, 'Home group', 'Cell')
    renderWizard(tree([homeGroup]), homeGroup)

    expect(screen.getByRole('heading', { name: 'Add home group' })).toBeTruthy()
    expect(screen.getByText('Name & place')).toBeTruthy()
    expect(screen.getByTitle('Home group leader')).toBeTruthy()
    expect(screen.queryByText('First home group')).toBeNull()
  })

  it('defaults the leader phone dial code to the church country', async () => {
    const user = userEvent.setup()
    const fellowship = layer('fel', 0, 'Fellowship', 'Fellowship')
    const cell = layer('cell', 1, 'Cell', 'Cell')
    renderWizard(tree([fellowship, cell]), fellowship, undefined, 'US')

    await user.type(screen.getByLabelText(/fellowship name/i), 'Zion')
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    expect(screen.getByLabelText('Country code')).toHaveTextContent('+1')
    expect(screen.getByText('Fellowship leader')).toBeTruthy()
    expect(screen.getByLabelText('Step 2 of 2')).toBeTruthy()
  })

  it('shows state and home address on the US leader step and blocks continue without state', async () => {
    const user = userEvent.setup()
    const fellowship = layer('fel', 0, 'Fellowship', 'Fellowship')
    const cell = layer('cell', 1, 'Cell', 'Cell')
    renderWizard(tree([fellowship, cell]), fellowship, undefined, 'US')

    await user.type(screen.getByLabelText(/fellowship name/i), 'Zion')
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    expect(screen.getByLabelText(/home address/i)).toBeTruthy()
    expect(screen.getByLabelText(/^state/i)).toBeTruthy()

    await user.type(screen.getByLabelText(/leader name/i), 'Ada')
    await user.type(screen.getByLabelText(/leader email/i), 'ada@example.com')
    await user.type(screen.getByLabelText(/phone number/i), '2025550100')

    expect(screen.getByRole('button', { name: /create fellowship/i })).toBeDisabled()
  })

  it('shows home address and a region dropdown on the Ghana leader step', async () => {
    const user = userEvent.setup()
    const fellowship = layer('fel', 0, 'Fellowship', 'Fellowship')
    const cell = layer('cell', 1, 'Cell', 'Cell')
    renderWizard(tree([fellowship, cell]), fellowship, undefined, 'GH')

    await user.type(screen.getByLabelText(/fellowship name/i), 'Zion')
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    expect(screen.getByLabelText(/home address/i)).toBeTruthy()
    expect(screen.getByLabelText(/^region/i)).toBeTruthy()
    expect(screen.getByRole('option', { name: 'Greater Accra' })).toBeTruthy()
  })

  it('scopes the parent when adding a cell under a fellowship', () => {
    const fellowship = layer('fel', 0, 'Fellowship', 'Fellowship')
    const cell = layer('cell', 1, 'Cell', 'Cell')
    const structure = tree([fellowship, cell], [node('f1', 'fel', null, 'Titans Fellowship')])
    renderWizard(structure, cell, 'f1')

    expect(screen.getByText(/under/i)).toBeTruthy()
    expect(screen.getByText('Titans Fellowship')).toBeTruthy()
  })
})
