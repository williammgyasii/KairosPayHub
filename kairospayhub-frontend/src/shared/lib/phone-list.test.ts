import { describe, expect, it } from 'vitest'
import { isPhoneListViewport, phoneListCard } from '@/shared/lib/phone-list'

describe('phoneListCard', () => {
  it('keeps the title and the first two non-empty lines', () => {
    const card = phoneListCard({
      title: 'Ama Mensah',
      lines: ['Titans Cell · Cell leader', '', '  ', '+233 24 111 2202', 'extra ignored'],
      details: [{ label: 'Email', value: 'ama@hilltop.org' }],
    })

    expect(card.title).toBe('Ama Mensah')
    expect(card.lines).toEqual(['Titans Cell · Cell leader', '+233 24 111 2202'])
  })

  it('turns empty detail values into an em dash', () => {
    const card = phoneListCard({
      title: 'Kofi Asante',
      details: [
        { label: 'Email', value: 'kofi@hilltop.org' },
        { label: 'Date of birth', value: '  ' },
        { label: 'State', value: null },
      ],
    })

    expect(card.details).toEqual([
      { label: 'Email', value: 'kofi@hilltop.org' },
      { label: 'Date of birth', value: '—' },
      { label: 'State', value: '—' },
    ])
  })
})

describe('isPhoneListViewport', () => {
  it('treats 767 as phone and 768 as tablet', () => {
    expect(isPhoneListViewport(767)).toBe(true)
    expect(isPhoneListViewport(768)).toBe(false)
  })
})
