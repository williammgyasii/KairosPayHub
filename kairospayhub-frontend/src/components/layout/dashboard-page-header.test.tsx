import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { DashboardPageHeader } from '@/components/layout/dashboard-page-header'

describe('DashboardPageHeader', () => {
  it('applies page-title and muted-body type roles', () => {
    render(
      <MemoryRouter>
        <DashboardPageHeader title="Attendance" description="Mark and review attendance" />
      </MemoryRouter>,
    )

    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading.className).toMatch(/text-page-title/)
    expect(screen.getByText('Mark and review attendance').className).toMatch(/text-muted-body/)
  })

  it('keeps the header width-constrained for long titles', () => {
    const { container } = render(
      <MemoryRouter>
        <DashboardPageHeader title="Very long campaign title that should not blow out the layout" />
      </MemoryRouter>,
    )

    expect(container.firstElementChild?.className).toMatch(/min-w-0/)
  })

  it('applies hero title role when requested', () => {
    render(
      <MemoryRouter>
        <DashboardPageHeader title="Home" titleSize="hero" />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { level: 1 }).className).toMatch(/text-page-title-hero/)
  })
})
