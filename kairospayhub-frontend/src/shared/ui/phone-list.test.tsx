import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PhoneList } from '@/shared/ui/phone-list'

const items = [
  {
    id: 'ama',
    title: 'Ama Mensah',
    lines: ['Titans Cell · Cell leader', '+233 24 111 2202'],
    details: [
      { label: 'Email', value: 'ama@hilltop.org' },
      { label: 'Date of birth', value: '12 Mar 1994' },
    ],
    actions: <button type="button">Open menu</button>,
  },
]

describe('PhoneList', () => {
  it('shows the table on tablet and cards on phone', () => {
    const { rerender } = render(
      <PhoneList phone={false} items={items}>
        <table>
          <tbody>
            <tr>
              <td>Desktop grid</td>
            </tr>
          </tbody>
        </table>
      </PhoneList>,
    )

    expect(screen.getByText('Desktop grid')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Ama Mensah' })).toBeNull()

    rerender(
      <PhoneList phone items={items}>
        <table>
          <tbody>
            <tr>
              <td>Desktop grid</td>
            </tr>
          </tbody>
        </table>
      </PhoneList>,
    )

    expect(screen.queryByText('Desktop grid')).toBeNull()
    expect(screen.getByRole('button', { name: /Ama Mensah/ })).toBeTruthy()
    expect(screen.getByText('Titans Cell · Cell leader')).toBeTruthy()
  })

  it('opens every detail pair when the card is tapped and ignores the actions slot', async () => {
    const user = userEvent.setup()

    render(
      <PhoneList phone items={items}>
        <table />
      </PhoneList>,
    )

    await user.click(screen.getByRole('button', { name: 'Open menu' }))
    expect(screen.queryByRole('dialog')).toBeNull()

    await user.click(screen.getByRole('button', { name: /Ama Mensah/ }))
    expect(screen.getByRole('dialog', { name: 'Ama Mensah' })).toBeTruthy()
    expect(screen.getByText('Email')).toBeTruthy()
    expect(screen.getByText('ama@hilltop.org')).toBeTruthy()
    expect(screen.getByText('Date of birth')).toBeTruthy()
    expect(screen.getByText('12 Mar 1994')).toBeTruthy()
  })

  it('delegates card tap when onItemOpen is set', async () => {
    const user = userEvent.setup()
    const onItemOpen = vi.fn()

    render(
      <PhoneList phone items={items} onItemOpen={onItemOpen}>
        <table />
      </PhoneList>,
    )

    await user.click(screen.getByRole('button', { name: /Ama Mensah/ }))
    expect(onItemOpen).toHaveBeenCalledWith('ama')
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
