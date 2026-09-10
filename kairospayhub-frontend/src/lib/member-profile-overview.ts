import { format, parseISO } from 'date-fns'
import { formatOccupationStatus } from '@/lib/member-filters'
import { occupationFieldsPolicy } from '@/lib/occupation-fields-policy'
import { profileAddressPolicy } from '@/lib/profile-address-policy'
import type { StructureMemberRow } from '@/lib/structure-table-rows'

export type MemberProfileOverviewField = {
  id: string
  label: string
  value: string
  wide?: boolean
}

export type MemberProfileOverviewSection = {
  id: string
  title: string
  fields: MemberProfileOverviewField[]
}

function formatDob(value: string) {
  if (!value.trim()) return ''
  try {
    return format(parseISO(value), 'PPP')
  } catch {
    return value
  }
}

function stateDisplay(code: string | undefined, countryCode?: string | null) {
  const trimmed = code?.trim() ?? ''
  if (!trimmed) return ''
  const match = profileAddressPolicy(countryCode).stateOptions.find(
    (option) => option.code === trimmed,
  )
  return match?.label ?? trimmed
}

export function memberProfileOverviewSections(
  row: Pick<
    StructureMemberRow,
    | 'phone'
    | 'email'
    | 'dateOfBirth'
    | 'age'
    | 'residence'
    | 'state'
    | 'occupationStatus'
    | 'schoolOrWorkplace'
    | 'workplace'
  >,
  countryCode?: string | null,
): MemberProfileOverviewSection[] {
  const address = profileAddressPolicy(countryCode)
  const occupation = occupationFieldsPolicy(
    row.occupationStatus as import('@/api/structure').MemberOccupationStatus | '' | null,
  )
  const personal: MemberProfileOverviewField[] = [
    { id: 'dob', label: 'Date of birth', value: formatDob(row.dateOfBirth) },
    { id: 'age', label: 'Age', value: row.age.trim() },
  ]
  if (address.showState) {
    personal.push({
      id: 'state',
      label: address.stateLabel,
      value: stateDisplay(row.state, countryCode),
    })
  }
  personal.push({
    id: 'residence',
    label: address.residenceLabel,
    value: row.residence.trim(),
    wide: true,
  })

  const work: MemberProfileOverviewField[] = [
    { id: 'occupation', label: 'Occupation', value: formatOccupationStatus(row.occupationStatus) },
  ]
  if (occupation.showSchool) {
    work.push({
      id: 'school',
      label: occupation.schoolLabel,
      value: row.schoolOrWorkplace.trim(),
    })
  }
  if (occupation.showWorkplace) {
    work.push({
      id: 'workplace',
      label: occupation.workplaceLabel,
      value: (row.workplace || (!occupation.showSchool ? row.schoolOrWorkplace : '')).trim(),
    })
  }

  return [
    {
      id: 'contact',
      title: 'Contact',
      fields: [
        { id: 'phone', label: 'Phone', value: row.phone.trim() },
        { id: 'email', label: 'Email', value: row.email.trim() },
      ],
    },
    { id: 'personal', title: 'Personal', fields: personal },
    { id: 'work', title: 'Work & study', fields: work },
  ]
}
