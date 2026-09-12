import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { GenerateJoinLinkDialog } from '@/features/roster/components/generate-join-link-dialog'

const api = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}))

vi.mock('@/shared/api', () => ({
  useApi: () => api,
}))

describe('GenerateJoinLinkDialog', () => {
  it('stacks the QR above a bottom Copy link action', async () => {
    api.get.mockResolvedValue({ token: 'join-token', expiresAt: '2026-09-18T00:00:00.000Z' })

    render(<GenerateJoinLinkDialog open onOpenChange={vi.fn()} nodeId="cell-1" />)

    const copy = await screen.findByRole('button', { name: 'Copy link' })
    const qr = screen.getByRole('img', { name: /qr code/i })
    expect(copy.compareDocumentPosition(qr) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy()

    const actions = screen.getAllByRole('button')
    expect(actions.at(-1)).toBe(copy)
  })
})
