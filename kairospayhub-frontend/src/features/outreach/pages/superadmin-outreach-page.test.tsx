import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { SuperadminOutreachPage } from './superadmin-outreach-page'

const session = vi.hoisted(() => ({
  get: vi.fn(),
}))

vi.mock('@/features/outreach/lib/operator-session', () => ({
  operatorGet: session.get,
  signOutOperator: vi.fn(),
}))

describe('SuperadminOutreachPage', () => {
  it('shows lead metrics and the search nav', async () => {
    session.get.mockResolvedValue({ total: 4, scouted: 2, responded: 1, converted: 1 })
    render(
      <MemoryRouter initialEntries={['/superadmin']}>
        <SuperadminOutreachPage />
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Search leads' })).toBeTruthy()
    expect(await screen.findByText('4')).toBeTruthy()
    expect(screen.getByText('Scouted')).toBeTruthy()
    expect(screen.getByText('Responded')).toBeTruthy()
    expect(screen.getByText('Converted')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Use my location' })).toBeNull()
    expect(screen.queryByRole('columnheader', { name: 'Email' })).toBeNull()
  })
})
