import { beforeEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { SuperadminSavedPage } from './superadmin-saved-page'

const session = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
}))

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))

vi.mock('@/features/outreach/lib/operator-session', () => ({
  operatorGet: session.get,
  operatorPost: session.post,
  operatorPatch: session.patch,
  signOutOperator: vi.fn(),
}))

vi.mock('sonner', () => ({ toast }))

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

const messagesPath = '/api/outreach/churches/11111111-1111-1111-1111-111111111111/messages'

function draftThen(send: () => Promise<unknown>) {
  session.post.mockImplementation((path: string) =>
    path.endsWith('/draft')
      ? Promise.resolve({ subject: 'A note for Madison', body: 'We built a giving tool for churches.' })
      : send(),
  )
}

function sendCalls() {
  return session.post.mock.calls.filter(([path]) => path === messagesPath)
}

function renderPage() {
  render(
    <MemoryRouter initialEntries={['/superadmin/saved']}>
      <SuperadminSavedPage />
    </MemoryRouter>,
  )
}

describe('SuperadminSavedPage', () => {
  beforeEach(() => {
    session.get.mockReset()
    session.post.mockReset()
    session.patch.mockReset()
    toast.success.mockReset()
    toast.error.mockReset()
    session.get.mockResolvedValue({ churches: [lead], totalCount: 1, page: 1, pageSize: 10 })
  })

  it('reaches a saved church and records the outcome by hand', async () => {
    const user = userEvent.setup()
    draftThen(() => Promise.resolve({ sent: true }))
    session.patch.mockResolvedValue({ status: 'Success' })
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Message Madison Christian Church' }))
    expect(await screen.findByLabelText('Message')).toHaveValue('We built a giving tool for churches.')
    await user.click(screen.getByRole('button', { name: 'Reach out' }))

    expect(session.post).toHaveBeenCalledWith(
      messagesPath,
      { subject: 'A note for Madison', body: 'We built a giving tool for churches.' },
      { idempotencyKey: expect.any(String) },
    )
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('info@madisonchristian.org')))

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

  it('shows the recipient as a labelled badge', async () => {
    const user = userEvent.setup()
    draftThen(() => Promise.resolve({ sent: true }))
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Message Madison Christian Church' }))
    const recipient = await screen.findByTestId('recipient')

    expect(within(recipient).getByText('To')).toBeTruthy()
    expect(within(recipient).getByText('info@madisonchristian.org')).toBeTruthy()
  })

  it('disables Reach out with a spinner while sending and sends once', async () => {
    const user = userEvent.setup()
    let finish: (value: unknown) => void = () => {}
    draftThen(() => new Promise((resolve) => (finish = resolve)))
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Message Madison Christian Church' }))
    await screen.findByDisplayValue('We built a giving tool for churches.')
    await user.click(screen.getByRole('button', { name: 'Reach out' }))

    const sending = await screen.findByRole('button', { name: /Sending/ })
    expect(sending).toBeDisabled()
    await user.click(sending)
    expect(sendCalls()).toHaveLength(1)

    finish({ sent: true })
    expect(await screen.findByRole('button', { name: 'Sent' })).toBeDisabled()
  })

  it('toasts a failed send and retries with the same key', async () => {
    const user = userEvent.setup()
    const outcomes = [() => Promise.reject(new Error('Outreach mail is not configured.')), () => Promise.resolve({ sent: true })]
    draftThen(() => outcomes.shift()!())
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Message Madison Christian Church' }))
    await screen.findByDisplayValue('We built a giving tool for churches.')
    await user.click(screen.getByRole('button', { name: 'Reach out' }))
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Outreach mail is not configured.'))

    await user.click(await screen.findByRole('button', { name: 'Reach out' }))
    await waitFor(() => expect(toast.success).toHaveBeenCalled())

    const [first, second] = sendCalls()
    expect(second[2].idempotencyKey).toBe(first[2].idempotencyKey)
  })

  it('revises the draft without sending', async () => {
    const user = userEvent.setup()
    session.post.mockImplementation((path: string) =>
      path.endsWith('/draft')
        ? Promise.resolve({ subject: 'A shorter note', body: 'A shorter draft.' })
        : Promise.resolve({ sent: true }),
    )
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Message Madison Christian Church' }))
    await screen.findByLabelText('Message')
    await user.type(screen.getByLabelText('Revise'), 'make it shorter')
    await user.click(screen.getByRole('button', { name: 'Revise' }))

    expect(await screen.findByLabelText('Message')).toHaveValue('A shorter draft.')
    expect(sendCalls()).toHaveLength(0)
  })
})
