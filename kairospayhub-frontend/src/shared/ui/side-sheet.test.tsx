import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SideSheet } from '@/shared/ui/side-sheet'

describe('SideSheet', () => {
  it('covers the viewport on phone when cover is page', () => {
    render(
      <SideSheet open onOpenChange={vi.fn()} title="Friday, Sep 11" cover="page">
        <p>Day events</p>
      </SideSheet>,
    )

    const dialog = screen.getByRole('dialog', { name: 'Friday, Sep 11' })
    expect(dialog.getAttribute('data-cover')).toBe('page')
    expect(dialog.className).toMatch(/inset-0/)
    expect(dialog.className).not.toMatch(/max-w-sm/)
  })

  it('stays a right rail by default', () => {
    render(
      <SideSheet open onOpenChange={vi.fn()} title="Details">
        <p>Body</p>
      </SideSheet>,
    )

    const dialog = screen.getByRole('dialog', { name: 'Details' })
    expect(dialog.getAttribute('data-cover')).toBe('rail')
    expect(dialog.className).toMatch(/max-w-md/)
  })
})
