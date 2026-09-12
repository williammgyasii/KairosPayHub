import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { TablePagination } from '@/shared/ui/table-pagination'

describe('TablePagination', () => {
  it('spreads previous, page, and next across the full width', () => {
    render(
      <TablePagination
        page={2}
        pageSize={25}
        totalCount={80}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
      />,
    )

    const nav = screen.getByRole('navigation', { name: 'Pagination' })
    expect(nav.className).toMatch(/justify-between/)
    expect(nav.className).toMatch(/w-full/)
    expect(screen.getByText('Showing 26–50 of 80')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Next page' })).toBeTruthy()
  })
})
