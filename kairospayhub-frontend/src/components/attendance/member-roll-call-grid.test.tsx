import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemberRollCallGrid } from '@/components/attendance/member-roll-call-grid'

describe('MemberRollCallGrid', () => {
  it('marks Present on single click and Absent on double click', () => {
    vi.useFakeTimers()
    const onToggleStatus = vi.fn()
    render(
      <MemberRollCallGrid
        members={[{ id: 'm1', name: 'Ada', status: 'Unrecorded' }]}
        onToggleStatus={onToggleStatus}
      />,
    )

    const button = screen.getByRole('button', { name: /Ada/i })
    fireEvent.click(button)
    expect(onToggleStatus).not.toHaveBeenCalled()
    vi.advanceTimersByTime(300)
    expect(onToggleStatus).toHaveBeenCalledWith('m1', 'Present')

    onToggleStatus.mockClear()
    fireEvent.doubleClick(button)
    expect(onToggleStatus).toHaveBeenCalledWith('m1', 'Absent')
    vi.useRealTimers()
  })

  it('shows marking hint when interactive', () => {
    render(
      <MemberRollCallGrid
        members={[{ id: 'm1', name: 'Ada', status: 'Unrecorded' }]}
        onToggleStatus={() => undefined}
      />,
    )
    expect(screen.getByText(/click to mark present/i)).toBeTruthy()
    expect(screen.getByText(/double-click to mark absent/i)).toBeTruthy()
  })
})
