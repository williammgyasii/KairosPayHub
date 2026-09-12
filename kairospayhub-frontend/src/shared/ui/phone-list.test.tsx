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

  it('flush rows span the list and keep footer links off the details tap', async () => {
    const user = userEvent.setup()
    const onCall = vi.fn()

    render(
      <PhoneList
        phone
        variant="flush"
        items={[
          {
            ...items[0],
            badges: <span>New</span>,
            footer: (
              <a
                href="tel:+12025551001"
                onClick={(event) => {
                  event.preventDefault()
                  onCall()
                }}
              >
                +1 202 555 1001
              </a>
            ),
          },
        ]}
      >
        <table />
      </PhoneList>,
    )

    const row = screen.getByTestId('phone-list-row')
    expect(row.getAttribute('data-variant')).toBe('flush')
    expect(row.className).not.toMatch(/rounded-xl/)
    expect(screen.getByText('New')).toBeTruthy()

    await user.click(screen.getByRole('link', { name: '+1 202 555 1001' }))
    expect(onCall).toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).toBeNull()

    await user.click(screen.getByRole('button', { name: /Ama Mensah/ }))
    expect(screen.getByRole('dialog', { name: 'Ama Mensah' })).toBeTruthy()
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
