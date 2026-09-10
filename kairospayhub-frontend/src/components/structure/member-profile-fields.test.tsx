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

  it('keeps residence and hides state for Ghana', () => {
    render(<Harness countryCode="GH" />)
    expect(screen.getByLabelText(/residence \/ location/i)).toBeTruthy()
    expect(screen.queryByLabelText(/^state/i)).toBeNull()
  })

  it('shows school and workplace when status is student and working', async () => {
    const user = userEvent.setup()
    render(<Harness countryCode="GH" />)
    await user.selectOptions(screen.getByLabelText(/^status/i), 'StudentAndWorking')
    expect(screen.getByLabelText(/school \/ institution/i)).toBeTruthy()
    expect(screen.getByLabelText(/^workplace/i)).toBeTruthy()
  })

  it('shows not working / unemployed as a persistable status', () => {
    render(<Harness countryCode="GH" />)
    expect(screen.getByRole('option', { name: 'Not working / Unemployed' })).toBeTruthy()
  })
})
