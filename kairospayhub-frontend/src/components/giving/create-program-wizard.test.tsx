import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Me } from '@/api/auth'
import type { StructureLayer, StructureLayerType, StructureNode, StructureTree } from '@/api/structure'
import { createProgram } from '@/api/giving'
import { CreateProgramWizard } from '@/components/giving/create-program-wizard'

vi.mock('@/api/giving', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/giving')>()
  return {
    ...actual,
    createProgram: vi.fn(),
  }
})

vi.mock('@/components/ui/date-picker', () => ({
  DatePicker: ({
    id,
    value,
    onChange,
    placeholder,
  }: {
    id?: string
    value: string
    onChange: (value: string) => void
    placeholder?: string
  }) => (
    <input
      id={id}
      data-testid={id}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}))

const me: Me & { onboarded: true } = {
  onboarded: true,
  id: 'u1',
  churchId: 'c1',
  churchName: 'Test Church',
  churchLogoUrl: null,
  organizationId: 'o1',
  role: 'Pastor',
  legacyChurchId: null,
  email: 'pastor@example.com',
  name: 'Pastor',
  countryCode: 'GH',
  leadershipProfile: 'churchWide',
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

function churchWideTree(): StructureTree {
  const cell = layer('cell', 0, 'Cell', 'Cell')
  return {
    churchId: 'c1',
    churchName: 'Test Church',
    template: { id: 'tpl', name: 'Main', layers: [cell] },
    nodes: [node('n1', 'cell', null, 'Cell 1')],
    members: [],
  }
}

async function goToLaunchStep(user: ReturnType<typeof userEvent.setup>) {
  await user.type(document.getElementById('wizard-title')!, 'Sunday Services')
  await user.click(screen.getByRole('button', { name: 'Continue' }))
}

describe('CreateProgramWizard', () => {
  beforeEach(() => {
    vi.mocked(createProgram).mockReset()
    vi.mocked(createProgram).mockResolvedValue({
      id: 'p1',
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
      receiveGivingsOnMain: true,
      directContributionCount: 0,
      directContributionTotalAmount: 0,
    })
  })

  it('uses two steps with date presets on basics', async () => {
    const user = userEvent.setup()
    render(
      <CreateProgramWizard
        open
        onOpenChange={() => undefined}
        me={me}
        api={{ post: vi.fn(), get: vi.fn() } as never}
        tree={churchWideTree()}
        onCreated={() => undefined}
      />,
    )

    expect(screen.getByText('Basics')).toBeTruthy()
    expect(screen.getByText('Until end of year')).toBeTruthy()
    expect(screen.getByText('Next 3 months')).toBeTruthy()
    expect(screen.queryByText('When should this go live?')).toBeNull()

    await user.type(document.getElementById('wizard-title')!, 'Sunday Services')
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    expect(screen.getByText('Launch')).toBeTruthy()
    expect(screen.getByText('When should this go live?')).toBeTruthy()
    expect(screen.getByText('Receive givings on main campaign?')).toBeTruthy()
  })

  it('shows first sub only when receive toggle is off', async () => {
    const user = userEvent.setup()
    render(
      <CreateProgramWizard
        open
        onOpenChange={() => undefined}
        me={me}
        api={{ post: vi.fn(), get: vi.fn() } as never}
        tree={churchWideTree()}
        onCreated={() => undefined}
      />,
    )

    await goToLaunchStep(user)

    const toggle = screen.getByTestId('receive-givings-on-main')
    expect(toggle).toHaveAttribute('role', 'switch')
    expect(toggle).toHaveAttribute('aria-checked', 'true')
    expect(screen.queryByTestId('first-sub-title')).toBeNull()

    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByText('First sub-campaign (required)')).toBeTruthy()
    expect(screen.getByTestId('first-sub-title')).toBeTruthy()

    const submit = screen.getByRole('button', { name: 'Create campaign' })
    expect(submit).toBeDisabled()

    await user.click(toggle)
    expect(screen.queryByTestId('first-sub-title')).toBeNull()
    expect(submit).not.toBeDisabled()

    await user.click(submit)
    expect(createProgram).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        title: 'Sunday Services',
        receiveGivingsOnMain: true,
      }),
    )
    expect(vi.mocked(createProgram).mock.calls[0][1].firstSubCampaign).toBeUndefined()
  })
})
