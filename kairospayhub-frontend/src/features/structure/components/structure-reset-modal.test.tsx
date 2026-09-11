import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  StructureLayerRemoveModal,
  StructureResetModal,
} from '@/features/structure/components/structure-reset-modal'

describe('StructureResetModal', () => {
  it('warns that units, members, attendance, and giving will be wiped', () => {
    render(
      <StructureResetModal open busy={false} onConfirm={() => undefined} onClose={() => undefined} />,
    )

    expect(screen.getByRole('heading', { name: /reset this church/i })).toBeTruthy()
    expect(screen.getByText(/every unit, every church member, attendance, and giving/i)).toBeTruthy()
  })

  it('cancel does not confirm', async () => {
    const onConfirm = vi.fn()
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(<StructureResetModal open busy={false} onConfirm={onConfirm} onClose={onClose} />)

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onConfirm).not.toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })
})

describe('StructureLayerRemoveModal', () => {
  it('offers delete structure when units already exist', async () => {
    const onOfferReset = vi.fn()
    const user = userEvent.setup()
    render(
      <StructureLayerRemoveModal
        layerName="Fellowship"
        intent="offerReset"
        busy={false}
        onConfirmRemove={() => undefined}
        onOfferReset={onOfferReset}
        onClose={() => undefined}
      />,
    )

    expect(screen.getByText(/while units exist/i)).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Delete structure' }))
    expect(onOfferReset).toHaveBeenCalled()
  })
})
