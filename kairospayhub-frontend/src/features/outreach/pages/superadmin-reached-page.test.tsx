import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { SuperadminReachedPage } from './superadmin-reached-page'

const session = vi.hoisted(() => ({
  get: vi.fn(),
}))

vi.mock('@/features/outreach/lib/operator-session', () => ({
  operatorGet: session.get,
  signOutOperator: vi.fn(),
}))

describe('SuperadminReachedPage', () => {
  it('shows the sent note as a chat message', async () => {
    session.get.mockResolvedValue({
      churches: [
        {
          id: '1',
          name: 'Test Church',
          email: 'gyasi.wk@gmail.com',
          sentAt: '2026-09-23T00:00:00Z',
          sentSubject: 'A note for Test Church',
          sentBody: 'We built a giving tool for churches.',
        },
        {
          id: '2',
          name: 'Unsent Church',
          email: 'office@example.com',
        },
      ],
      totalCount: 1,
    })
    render(
      <MemoryRouter initialEntries={['/superadmin/reached']}>
        <SuperadminReachedPage />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('link', { name: 'Reached' })).toBeTruthy()
    expect(screen.getByText('We built a giving tool for churches.')).toBeTruthy()
    expect(screen.queryByText('Unsent Church')).toBeNull()
  })
})
