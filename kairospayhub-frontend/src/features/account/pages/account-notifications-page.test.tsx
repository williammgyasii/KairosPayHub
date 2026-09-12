import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AccountNotificationsPage } from './AccountNotificationsPage'

const { enableWebPush, disableWebPush, currentEndpoint } = vi.hoisted(() => ({
  enableWebPush: vi.fn(),
  disableWebPush: vi.fn(),
  currentEndpoint: vi.fn(),
}))

vi.mock('@/shared/api/useApi', () => ({
  useApi: () => ({
    get: vi.fn().mockResolvedValue({ publicKey: 'vapid' }),
    put: vi.fn(),
    delete: vi.fn(),
  }),
}))

vi.mock('@/features/notifications/lib/web-push', () => ({
  enableWebPush: (...args: unknown[]) => enableWebPush(...args),
  disableWebPush: (...args: unknown[]) => disableWebPush(...args),
}))

vi.mock('@/features/notifications/lib/browser-push', () => ({
  browserEnablePushDeps: () => ({
    subscribe: async () => ({ endpoint: '', p256dh: '', auth: '' }),
  }),
  browserDisablePushDeps: () => ({
    currentEndpoint: () => currentEndpoint(),
    unsubscribe: async () => {},
  }),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }),
  })
})

beforeEach(() => {
  currentEndpoint.mockResolvedValue(null)
  enableWebPush.mockReset()
  disableWebPush.mockReset()
})

describe('AccountNotificationsPage', () => {
  it('does not mention an App Store download', async () => {
    render(<AccountNotificationsPage />)
    expect(screen.queryByText(/app store/i)).not.toBeInTheDocument()
    expect(await screen.findByRole('button', { name: /enable push/i })).toBeInTheDocument()
  })

  it('shows this device as on after enable succeeds', async () => {
    let finish!: (value: 'enabled') => void
    enableWebPush.mockImplementation((deps?: { onRequestingPermission?: () => void }) => {
      deps?.onRequestingPermission?.()
      return new Promise<'enabled'>((resolve) => {
        finish = resolve
      })
    })

    render(<AccountNotificationsPage />)
    await userEvent.click(await screen.findByRole('button', { name: /enable push/i }))

    expect(screen.getByRole('status')).toHaveTextContent(/address bar/i)
    expect(screen.getByRole('button', { name: /waiting for the address bar/i })).toBeDisabled()

    finish('enabled')
    expect(await screen.findByRole('status', { name: /push is on/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /enable push/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /disable push/i })).toBeEnabled()
  })

  it('asks Edge to click Enable once more after Allow', async () => {
    enableWebPush.mockResolvedValue('needsSecondClick')
    render(<AccountNotificationsPage />)
    await userEvent.click(await screen.findByRole('button', { name: /enable push/i }))
    expect(await screen.findByRole('status')).toHaveTextContent(/second click/i)
    expect(screen.getByRole('button', { name: /enable push/i })).toBeEnabled()
  })

  it('shows a success badge when this browser already has a subscription', async () => {
    currentEndpoint.mockResolvedValue('https://push.example/laptop')
    render(<AccountNotificationsPage />)
    expect(await screen.findByRole('status', { name: /push is on/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /enable push/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /disable push/i })).toBeEnabled()
  })
})
