import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { StructureLayer, StructureLayerType, StructureNode, StructureTree } from '@/api/structure'
import type { GivingProgram } from '@/features/giving/api'
import { CreateSubPeriodWizard } from '@/features/giving/components/create-sub-period-wizard'

vi.mock('@/shared/api', () => ({
  useApi: () => ({
    post: vi.fn(),
    get: vi.fn(),
  }),
}))

vi.mock('@/features/giving/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/giving/api')>()
  return {
    ...actual,
    createSubPeriod: vi.fn(),
    createBatchSubCampaigns: vi.fn(),
    previewBatchSubCampaigns: vi.fn(),
  }
})

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

const parent: GivingProgram = {
  id: 'prog-1',
  parentProgramId: null,
  givingType: 'SundayService',
  title: 'Sunday Services',
  periodLabel: '2026',
  startsOn: '2026-01-01',
  endsOn: '2026-12-31',
  scopeKind: 'ChurchWide',
  scopeNodeId: null,
  status: 'Open',
  approvalStatus: 'Approved',
  createdByRole: 'Pastor',
  createdByName: 'Pastor',
  createdByScopeUnitName: null,
  createdAt: '2026-01-01T00:00:00Z',
  totalApprovedAmount: 0,
  hasChildren: false,
  acceptsContributions: true,
  directContributionCount: 0,
  directContributionTotalAmount: 0,
}

describe('CreateSubPeriodWizard', () => {
  it('is a single form without Mode/Schedule/Scope/Review stepper', () => {
    const fellowship = layer('fel', 0, 'Fellowship', 'Fellowship')
    const cell = layer('cell', 1, 'Cell', 'Cell')
    const structure = tree(
      [fellowship, cell],
      [node('f1', 'fel', null, 'Titans'), node('c1', 'cell', 'f1', 'Cell 1')],
    )

    render(
      <CreateSubPeriodWizard
        open
        onOpenChange={() => undefined}
        parent={parent}
        api={{ post: vi.fn(), get: vi.fn() } as never}
        tree={structure}
        onCreated={() => undefined}
        actorLeadership="churchWide"
      />,
    )

    expect(screen.getByTestId('create-sub-period-form')).toBeTruthy()
    expect(screen.queryByText('Step 1 of 4')).toBeNull()
    expect(screen.queryByText('Mode')).toBeNull()
    expect(screen.queryByText('Schedule')).toBeNull()
    expect(screen.queryByText('Review')).toBeNull()
    expect(screen.getByText('One-off')).toBeTruthy()
    expect(screen.getByText('Scope')).toBeTruthy()
  })

  it('does not offer a PFCC chip on Fellowship → Cell', () => {
    const fellowship = layer('fel', 0, 'Fellowship', 'Fellowship')
    const cell = layer('cell', 1, 'Cell', 'Cell')
    const structure = tree(
      [fellowship, cell],
      [node('f1', 'fel', null, 'Titans'), node('c1', 'cell', 'f1', 'Cell 1')],
    )

    render(
      <CreateSubPeriodWizard
        open
        onOpenChange={() => undefined}
        parent={parent}
        api={{ post: vi.fn(), get: vi.fn() } as never}
        tree={structure}
        onCreated={() => undefined}
        actorLeadership="churchWide"
      />,
    )

    expect(screen.getByRole('button', { name: 'Church-wide' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Fellowship' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Cell' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'PFCC' })).toBeNull()
  })
})
