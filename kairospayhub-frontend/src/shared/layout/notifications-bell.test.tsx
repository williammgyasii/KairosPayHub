import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { NotificationsBell } from '@/shared/layout/notifications-bell'

const phone = vi.hoisted(() => ({ current: false }))

vi.mock('@/shared/lib/use-phone-list-viewport', () => ({
  usePhoneListViewport: () => phone.current,
}))

vi.mock('@/hooks/use-notifications', () => ({
  useNotifications: () => ({
    notifications: [],
    unreadCount: 0,
    loading: false,
    error: null,
    refresh: vi.fn(),
    markRead: vi.fn(),
    markAllRead: vi.fn(),
  }),
}))

function renderBell() {
  return render(
    <MemoryRouter>
      <NotificationsBell />
    </MemoryRouter>,
  )
}

describe('NotificationsBell', () => {
  it('pins a centered viewport panel on the phone', async () => {
    phone.current = true
    const user = userEvent.setup()
    renderBell()

    await user.click(screen.getByRole('button', { name: 'Notifications' }))
    const dialog = await screen.findByRole('dialog', { name: 'Notifications' })
    expect(dialog.className).toMatch(/left-1\/2/)
    expect(dialog.className).toMatch(/-translate-x-1\/2/)
    expect(dialog.className).toMatch(/100dvw/)
  })

  it('keeps the desktop popover aligned to the bell', async () => {
    phone.current = false
    const user = userEvent.setup()
    renderBell()

    await user.click(screen.getByRole('button', { name: 'Notifications' }))
    expect(await screen.findByText('No notifications yet')).toBeTruthy()
    expect(screen.queryByRole('dialog', { name: 'Notifications' })).toBeNull()
  })
})
