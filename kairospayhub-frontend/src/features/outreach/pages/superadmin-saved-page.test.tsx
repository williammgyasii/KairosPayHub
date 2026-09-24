import { beforeEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { SuperadminSavedPage } from './superadmin-saved-page'

const session = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
}))

vi.mock('@/features/outreach/lib/operator-session', () => ({
  operatorGet: session.get,
  operatorPost: session.post,
  operatorPatch: session.patch,
  signOutOperator: vi.fn(),
}))

const lead = {
  id: '11111111-1111-1111-1111-111111111111',
  name: 'Madison Christian Church',
  email: 'info@madisonchristian.org',
  website: 'https://www.madisonchristian.org/',
  city: 'Baltimore',
  state: 'MD',
  status: 'Scouted',
  saved: true,
}

describe('SuperadminSavedPage', () => {
  beforeEach(() => {
    session.get.mockReset()
    session.post.mockReset()
    session.patch.mockReset()
  })

  it('reaches a saved church and records the outcome by hand', async () => {
    const user = userEvent.setup()
    session.get.mockResolvedValue({ churches: [lead], totalCount: 1, page: 1, pageSize: 10 })
    session.post.mockImplementation((path: string) =>
      path.endsWith('/draft')
        ? Promise.resolve({ subject: 'A note for Madison', body: 'We built a giving tool for churches.' })
        : Promise.resolve({ sent: true }),
    )
    session.patch.mockResolvedValue({ status: 'Success' })
    render(
      <MemoryRouter initialEntries={['/superadmin/saved']}>
        <SuperadminSavedPage />
      </MemoryRouter>,
    )

    await user.click(await screen.findByRole('button', { name: 'Message Madison Christian Church' }))
    expect(await screen.findByLabelText('Message')).toHaveValue('We built a giving tool for churches.')
    await user.click(screen.getByRole('button', { name: 'Reach out' }))

    expect(session.post).toHaveBeenCalledWith(
      '/api/outreach/churches/11111111-1111-1111-1111-111111111111/messages',
      { subject: 'A note for Madison', body: 'We built a giving tool for churches.' },
    )
    expect(await screen.findByText(/Sent to info@madisonchristian.org/)).toBeTruthy()

    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByLabelText('Subject')).toBeNull())
    await user.click(screen.getByRole('button', { name: 'View Madison Christian Church' }))
    expect(screen.queryByLabelText('Subject')).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Success' }))
    expect(session.patch).toHaveBeenCalledWith(
      '/api/outreach/churches/11111111-1111-1111-1111-111111111111',
      { status: 'Success' },
    )
  })

  it('revises the draft without sending', async () => {
    const user = userEvent.setup()
    session.get.mockResolvedValue({ churches: [lead], totalCount: 1, page: 1, pageSize: 10 })
    session.post.mockImplementation((path: string) =>
      path.endsWith('/draft')
        ? Promise.resolve({ subject: 'A shorter note', body: 'A shorter draft.' })
        : Promise.resolve({ sent: true }),
    )
    render(
      <MemoryRouter initialEntries={['/superadmin/saved']}>
        <SuperadminSavedPage />
      </MemoryRouter>,
    )

    await user.click(await screen.findByRole('button', { name: 'Message Madison Christian Church' }))
    await screen.findByLabelText('Message')
    await user.type(screen.getByLabelText('Revise'), 'make it shorter')
    await user.click(screen.getByRole('button', { name: 'Revise' }))

    expect(await screen.findByLabelText('Message')).toHaveValue('A shorter draft.')
    expect(session.post).not.toHaveBeenCalledWith(
      '/api/outreach/churches/11111111-1111-1111-1111-111111111111/messages',
      expect.anything(),
    )
  })
})
