import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SearchLeadsTable } from './search-leads-table'

describe('SearchLeadsTable', () => {
  it('shows the website as a link that opens the church site in a new tab', () => {
    render(
      <SearchLeadsTable
        rows={[
          {
            id: '1',
            name: 'Madison Christian Church',
            email: 'info@madisonchristian.org',
            website: 'https://www.madisonchristian.org/',
          },
        ]}
        page={1}
        pageSize={10}
        totalCount={1}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
        onOpen={vi.fn()}
      />,
    )

    expect(screen.getByRole('columnheader', { name: 'Website' })).toBeTruthy()
    const link = screen.getByRole('link', { name: 'madisonchristian.org' })
    expect(link).toHaveAttribute('href', 'https://www.madisonchristian.org/')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })
})
