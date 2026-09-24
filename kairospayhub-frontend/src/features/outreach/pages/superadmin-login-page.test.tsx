import { beforeEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { RequireOperator } from '@/features/outreach/components/require-operator'
import { SuperadminLoginPage } from './superadmin-login-page'

function renderDoor(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/superadmin/login" element={<SuperadminLoginPage />} />
        <Route
          path="/superadmin"
          element={
            <RequireOperator>
              <h1>Church outreach</h1>
            </RequireOperator>
          }
        />
        <Route path="/login" element={<h1>Church sign-in</h1>} />
        <Route path="/" element={<h1>Dashboard</h1>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('operator door', () => {
  beforeEach(() => {
    sessionStorage.clear()
    vi.unstubAllGlobals()
  })

  it('sends an anonymous visitor to the operator sign-in', () => {
    renderDoor('/superadmin')
    expect(screen.getByRole('heading', { name: 'Operator sign-in' })).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Church sign-in' })).toBeNull()
  })

  it('opens the outreach page after a successful sign-in', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ accessToken: 'operator-token' }), { status: 200 })),
    )
    const user = userEvent.setup()
    renderDoor('/superadmin/login')

    await user.type(screen.getByLabelText('Email'), 'william@kairospayhub.com')
    await user.type(screen.getByLabelText('Password'), 'secret')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('heading', { name: 'Church outreach' })).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Dashboard' })).toBeNull()
  })
})
