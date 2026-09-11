import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { JoinSuccessView } from '@/components/structure/join-success-view'

describe('JoinSuccessView', () => {
  it('celebrates a successful join with the unit name', () => {
    render(<JoinSuccessView unitName="Titans Cell" churchName="Hilltop Church" />)

    expect(screen.getByRole('heading', { name: /you're on the list/i })).toBeTruthy()
    expect(screen.getByText(/titans cell/i)).toBeTruthy()
    expect(screen.getByText(/hilltop church/i)).toBeTruthy()
    expect(screen.getByText(/request received/i)).toBeTruthy()
    expect(screen.getByText(/you can close this page/i)).toBeTruthy()
  })
})
