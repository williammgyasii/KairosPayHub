import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { LogGivingMenu } from '@/features/giving/components/log-giving-menu'

describe('LogGivingMenu', () => {
  it('opens Single giving or Batch giving from Log giving', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()

    render(<LogGivingMenu onSelect={onSelect} />)

    await user.click(screen.getByRole('button', { name: 'Log giving' }))
    await user.click(screen.getByRole('menuitem', { name: 'Single giving' }))
    expect(onSelect).toHaveBeenCalledWith('single')

    await user.click(screen.getByRole('button', { name: 'Log giving' }))
    await user.click(screen.getByRole('menuitem', { name: 'Batch giving' }))
    expect(onSelect).toHaveBeenCalledWith('bulk')
  })
})
