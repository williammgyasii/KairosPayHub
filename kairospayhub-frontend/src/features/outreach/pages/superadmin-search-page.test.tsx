import { describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { SuperadminSearchPage } from './superadmin-search-page'

const session = vi.hoisted(() => ({
  post: vi.fn(),
  get: vi.fn(),
}))

vi.mock('@/features/outreach/lib/operator-session', () => ({
  operatorPost: session.post,
  operatorGet: session.get,
  signOutOperator: vi.fn(),
}))

const lead = {
  id: '11111111-1111-1111-1111-111111111111',
  name: 'Madison Christian Church',
  email: 'info@madisonchristian.org',
  website: 'https://www.madisonchristian.org/',
  address: '3565 Bixby Rd',
  city: 'Baltimore',
  state: 'MD',
  radiusMiles: 25,
}

describe('SuperadminSearchPage', () => {
  it('starts on Maryland with a radius and hides location when it is already on', async () => {
    const geolocation = {
      getCurrentPosition: vi.fn((success: PositionCallback) => {
        success({ coords: { latitude: 39.29, longitude: -76.61 } } as GeolocationPosition)
      }),
    }
    vi.stubGlobal('navigator', {
      geolocation,
      permissions: { query: vi.fn().mockResolvedValue({ state: 'granted' }) },
    })
    session.post.mockResolvedValue({ state: 'MD', city: 'Baltimore' })
    session.get.mockResolvedValue({ cities: ['Annapolis', 'Baltimore'] })
    render(
      <MemoryRouter initialEntries={['/superadmin/search']}>
        <SuperadminSearchPage />
      </MemoryRouter>,
    )

    expect(screen.getByLabelText('State')).toHaveValue('MD')
    expect(screen.getByLabelText('Radius')).toHaveValue('25')
    expect(screen.queryByRole('button', { name: 'Use my location' })).toBeNull()
    expect(await screen.findByDisplayValue('Baltimore')).toBeTruthy()
    expect(screen.queryByText('Responded')).toBeNull()
  })

  it('searches into a paged table and opens a lead', async () => {
    vi.stubGlobal('navigator', { permissions: { query: vi.fn().mockResolvedValue({ state: 'prompt' }) } })
    session.post.mockResolvedValue({
      churches: [lead],
      totalCount: 1,
      page: 1,
      pageSize: 10,
    })
    session.get.mockResolvedValue({ cities: ['Annapolis', 'Baltimore'] })
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/superadmin/search']}>
        <SuperadminSearchPage />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('button', { name: 'Use my location' })).toBeTruthy()
    expect(await screen.findByRole('option', { name: 'Baltimore' })).toBeTruthy()
    await user.selectOptions(screen.getByLabelText('City'), 'Baltimore')
    await user.selectOptions(screen.getByLabelText('Radius'), '10')
    await user.click(screen.getByRole('button', { name: 'Search' }))

    expect(session.post).toHaveBeenCalledWith('/api/outreach/searches', {
      state: 'MD',
      city: 'Baltimore',
      radiusMiles: 10,
      page: 1,
      pageSize: 10,
    })
    expect(await screen.findByRole('columnheader', { name: 'City' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Save Madison Christian Church' })).toBeTruthy()
    expect(screen.getByText('info@madisonchristian.org')).toBeTruthy()
    expect(screen.queryByText('Responded')).toBeNull()
    await user.click(screen.getByRole('button', { name: 'View Madison Christian Church' }))
    expect(screen.getByText('3565 Bixby Rd')).toBeTruthy()
  })
})
