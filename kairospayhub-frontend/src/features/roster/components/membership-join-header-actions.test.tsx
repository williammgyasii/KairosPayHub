import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MembershipJoinHeaderActions } from '@/features/roster/components/membership-join-header-actions'

describe('MembershipJoinHeaderActions', () => {
  it('keeps tabs on the left and Add invite on the far right', async () => {
    const user = userEvent.setup()
    const onTabChange = vi.fn()
    const onGenerateJoinLink = vi.fn()

    render(
      <MembershipJoinHeaderActions
        tab="all"
        onTabChange={onTabChange}
        pendingCount={2}
        onGenerateJoinLink={onGenerateJoinLink}
      />,
    )

    expect(screen.getByRole('button', { name: /pending members/i })).toBeTruthy()
    const invite = screen.getByRole('button', { name: /add invite/i })
    expect(invite).toBeTruthy()
    expect(invite.className).toMatch(/ml-auto/)
    expect(screen.getByText('2')).toBeTruthy()

    await user.click(screen.getByRole('button', { name: /pending members/i }))
    expect(onTabChange).toHaveBeenCalledWith('pending')
  })
})
