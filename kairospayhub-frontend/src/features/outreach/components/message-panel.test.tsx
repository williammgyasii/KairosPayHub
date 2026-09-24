import { describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { render, screen } from '@testing-library/react'
import { MessagePanel } from './message-panel'

describe('MessagePanel', () => {
  it('stays open when the backdrop is clicked and closes from the button or Escape', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    render(
      <MessagePanel open onOpenChange={onOpenChange} title="Message Madison">
        <p>Draft</p>
      </MessagePanel>,
    )

    await user.click(screen.getByTestId('message-panel-backdrop'))
    expect(onOpenChange).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog', { name: 'Message Madison' })).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(onOpenChange).toHaveBeenLastCalledWith(false)

    onOpenChange.mockClear()
    await user.keyboard('{Escape}')
    expect(onOpenChange).toHaveBeenLastCalledWith(false)
  })
})
