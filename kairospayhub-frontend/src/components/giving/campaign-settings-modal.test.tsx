import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { GivingProgram } from '@/api/giving'
import { updateProgramSettings } from '@/api/giving'
import { CampaignSettingsModal } from '@/components/giving/campaign-settings-modal'

vi.mock('@/api/giving', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/giving')>()
  return {
    ...actual,
    updateProgramSettings: vi.fn(),
  }
})

function program(overrides: Partial<GivingProgram> = {}): GivingProgram {
  return {
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
    hasChildren: true,
    acceptsContributions: true,
    receiveGivingsOnMain: true,
    directContributionCount: 0,
    directContributionTotalAmount: 0,
    ...overrides,
  }
}

const child = program({
  id: 'sub-1',
  parentProgramId: 'prog-1',
  title: 'Week 1',
  hasChildren: false,
  receiveGivingsOnMain: undefined,
})

describe('CampaignSettingsModal', () => {
  beforeEach(() => {
    vi.mocked(updateProgramSettings).mockReset()
    vi.mocked(updateProgramSettings).mockResolvedValue(program({ receiveGivingsOnMain: false }))
  })

  it('turn off with directs opens pick-or-create migrate', async () => {
    const user = userEvent.setup()
    render(
      <CampaignSettingsModal
        open
        onOpenChange={() => undefined}
        program={program({ directContributionCount: 3 })}
        children={[child]}
        api={{ patch: vi.fn(), get: vi.fn() } as never}
        onSaved={() => undefined}
      />,
    )

    expect(screen.queryByTestId('migrate-direct-givings')).toBeNull()
    await user.click(screen.getByTestId('settings-receive-givings-on-main'))
    expect(screen.getByTestId('migrate-direct-givings')).toBeTruthy()
    expect(screen.getByTestId('migrate-pick-sub')).toBeTruthy()
    expect(screen.getByText('Create new sub-campaign')).toBeTruthy()
  })

  it('turn on saves without migrate', async () => {
    const user = userEvent.setup()
    const onSaved = vi.fn()
    render(
      <CampaignSettingsModal
        open
        onOpenChange={() => undefined}
        program={program({ receiveGivingsOnMain: false, directContributionCount: 2 })}
        children={[child]}
        api={{ patch: vi.fn(), get: vi.fn() } as never}
        onSaved={onSaved}
      />,
    )

    await user.click(screen.getByTestId('settings-receive-givings-on-main'))
    expect(screen.queryByTestId('migrate-direct-givings')).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Save settings' }))

    expect(updateProgramSettings).toHaveBeenCalledWith(
      expect.anything(),
      'prog-1',
      { receiveGivingsOnMain: true },
    )
    expect(onSaved).toHaveBeenCalled()
  })
})
