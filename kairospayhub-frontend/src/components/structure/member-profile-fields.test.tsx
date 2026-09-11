import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  MemberProfileFields,
  memberProfileInitialValues,
  type MemberProfileFormValues,
} from './member-profile-fields'

function Harness({
  countryCode,
  initial,
}: {
  countryCode?: string
  initial?: Partial<MemberProfileFormValues>
}) {
  const [values, setValues] = useState<MemberProfileFormValues>({
    ...memberProfileInitialValues({ countryCode }),
    ...initial,
  })
  return (
    <MemberProfileFields
      values={values}
      onChange={(patch) => setValues((current) => ({ ...current, ...patch }))}
      churchCountryCode={countryCode}
      requirePhoneAndDob
    />
  )
}

describe('MemberProfileFields', () => {
  it('shows state and home address for a US church', () => {
    render(<Harness countryCode="US" />)
    expect(screen.getByLabelText(/home address/i)).toBeTruthy()
    expect(screen.getByLabelText(/^state/i)).toBeTruthy()
  })

  it('shows home address and a region dropdown for Ghana', () => {
    render(<Harness countryCode="GH" />)
    expect(screen.getByLabelText(/home address/i)).toBeTruthy()
    expect(screen.getByLabelText(/^region/i)).toBeTruthy()
    expect(screen.getByRole('option', { name: 'Greater Accra' })).toBeTruthy()
  })

  it('shows school and workplace when status is student and working', async () => {
    const user = userEvent.setup()
    render(<Harness countryCode="GH" />)
    await user.selectOptions(screen.getByLabelText(/^status/i), 'StudentAndWorking')
    expect(screen.getByLabelText(/school \/ institution/i)).toBeTruthy()
    expect(screen.getByLabelText(/^workplace/i)).toBeTruthy()
  })

  it('puts state and home address on the same row in grid layout', () => {
    const { container } = render(
      <MemberProfileFields
        layout="grid"
        requirePhoneAndDob
        churchCountryCode="US"
        values={memberProfileInitialValues({ countryCode: 'US' })}
        onChange={() => undefined}
      />,
    )
    const stateField = screen.getByLabelText(/^state/i).closest('.space-y-1\\.5')
    const addressField = screen.getByLabelText(/home address/i).closest('.space-y-1\\.5')
    expect(stateField?.parentElement).toBe(addressField?.parentElement)
    expect(container.querySelector('.sm\\:grid-cols-2')).toBeTruthy()
  })

  it('lays identity and contact fields in a two-column grid', () => {
    const { container } = render(
      <MemberProfileFields
        layout="grid"
        requirePhoneAndDob
        requireEmail
        churchCountryCode="GH"
        values={memberProfileInitialValues({ countryCode: 'GH' })}
        onChange={() => undefined}
        identity={{
          name: '',
          email: '',
          onName: () => undefined,
          onEmail: () => undefined,
        }}
      />,
    )
    expect(container.querySelector('.sm\\:grid-cols-2')).toBeTruthy()
    expect(screen.getByLabelText(/full name/i)).toBeTruthy()
    expect(screen.getByLabelText(/^email/i)).toBeTruthy()
    expect(screen.getByLabelText(/phone number/i)).toBeTruthy()
  })

  it('shows not working / unemployed as a persistable status', () => {
    render(<Harness countryCode="GH" />)
    expect(screen.getByRole('option', { name: 'Not working / Unemployed' })).toBeTruthy()
  })
})
