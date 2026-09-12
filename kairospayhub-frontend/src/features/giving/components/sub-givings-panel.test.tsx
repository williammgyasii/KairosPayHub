import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import type { GivingProgram } from '@/features/giving/api'
import { SubGivingsPanel } from '@/features/giving/components/sub-givings-panel'

vi.mock('@/shared/lib/use-phone-list-viewport', () => ({
  usePhoneListViewport: () => true,
}))

function child(overrides: Partial<GivingProgram> = {}): GivingProgram {
  return {
    id: 'sub-1',
    parentProgramId: 'prog-1',
    givingType: 'Rhapsody',
    title: 'Last Quarter Givings',
    periodLabel: '2026-09-11',
    scopeKind: 'ChurchWide',
    scopeNodeId: null,
    status: 'Open',
    approvalStatus: 'Approved',
    createdByRole: 'Pastor',
    createdByName: 'Pastor',
    createdByScopeUnitName: null,
    createdAt: '2026-09-11T00:00:00Z',
    totalApprovedAmount: 0,
    hasChildren: false,
    acceptsContributions: true,
    directContributionCount: 0,
    directContributionTotalAmount: 0,
    ...overrides,
  }
}

describe('SubGivingsPanel', () => {
  it('opens the sub-campaign page from a phone card and does not repeat the tab heading', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/givings/prog-1']}>
        <Routes>
          <Route
            path="/givings/prog-1"
            element={
              <SubGivingsPanel
                meRole="Pastor"
                children={[child()]}
                api={{} as never}
                onRefresh={async () => undefined}
              />
            }
          />
          <Route path="/givings/sub-1" element={<p>Last Quarter page</p>} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.queryByRole('heading', { name: 'Sub givings' })).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Last Quarter Givings' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByText('Last Quarter page')).toBeTruthy()
  })
})
