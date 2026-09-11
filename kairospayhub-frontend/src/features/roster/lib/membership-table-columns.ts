/** Column visibility policy for membership roster tables (not church-template volatility). */

export type MembershipProfileColumnId =
  | 'email'
  | 'phone'
  | 'age'
  | 'dateOfBirth'
  | 'residence'
  | 'state'
  | 'occupationStatus'
  | 'schoolOrWorkplace'
  | 'workplace'
  | 'responsiveness'
  | 'role'

export type MembershipLayerRef = { id: string; displayName: string }

export const MEMBERSHIP_ALWAYS_VISIBLE_COLUMN_IDS = ['member'] as const

export const MEMBERSHIP_PROFILE_COLUMN_LABELS: Record<MembershipProfileColumnId, string> = {
  email: 'Email',
  phone: 'Phone',
  age: 'Age',
  dateOfBirth: 'Date of birth',
  residence: 'Residence',
  state: 'State',
  occupationStatus: 'Occupation',
  schoolOrWorkplace: 'School',
  workplace: 'Workplace',
  responsiveness: 'Responsiveness',
  role: 'Role',
}

/** Pastoral glance defaults — deep profile fields off until toggled. */
export const DEFAULT_MEMBERSHIP_PROFILE_COLUMN_VISIBILITY: Record<
  MembershipProfileColumnId,
  boolean
> = {
  email: true,
  phone: true,
  age: false,
  dateOfBirth: false,
  residence: false,
  state: false,
  occupationStatus: false,
  schoolOrWorkplace: false,
  workplace: false,
  responsiveness: true,
  role: true,
}

export function structureMembershipColumnId(layerId: string): string {
  return `structure-${layerId}`
}

export function defaultMembershipColumnVisibility(
  layers: MembershipLayerRef[],
): Record<string, boolean> {
  const visibility: Record<string, boolean> = {
    member: true,
    ...DEFAULT_MEMBERSHIP_PROFILE_COLUMN_VISIBILITY,
  }
  for (const layer of layers) {
    visibility[structureMembershipColumnId(layer.id)] = true
  }
  return visibility
}

export function membershipToggleableColumnIds(layers: MembershipLayerRef[]): string[] {
  return [
    ...(Object.keys(MEMBERSHIP_PROFILE_COLUMN_LABELS) as MembershipProfileColumnId[]),
    ...layers.map((layer) => structureMembershipColumnId(layer.id)),
  ]
}

export function membershipColumnLabel(
  columnId: string,
  layers: MembershipLayerRef[],
): string {
  if (columnId === 'member') return 'Name'
  if (columnId in MEMBERSHIP_PROFILE_COLUMN_LABELS) {
    return MEMBERSHIP_PROFILE_COLUMN_LABELS[columnId as MembershipProfileColumnId]
  }
  const layer = layers.find((l) => structureMembershipColumnId(l.id) === columnId)
  return layer?.displayName ?? columnId
}

/** Merge patches; Name (member) cannot be turned off. */
export function mergeMembershipColumnVisibility(
  current: Record<string, boolean>,
  patch: Record<string, boolean>,
): Record<string, boolean> {
  return {
    ...current,
    ...patch,
    member: true,
  }
}

/** Min widths so multi-word headers (e.g. Date of birth) stay on one line. */
export function membershipColumnMinWidthClass(columnId: string): string | undefined {
  switch (columnId) {
    case 'member':
      return 'min-w-[13.75rem]'
    case 'email':
      return 'min-w-[8rem] max-w-[12rem]'
    case 'phone':
      return 'min-w-[8.5rem]'
    case 'age':
      return 'min-w-[4rem]'
    case 'dateOfBirth':
      return 'min-w-[10rem]'
    case 'residence':
      return 'min-w-[8rem]'
    case 'state':
      return 'min-w-[5.5rem]'
    case 'occupationStatus':
      return 'min-w-[8rem]'
    case 'schoolOrWorkplace':
      return 'min-w-[8rem]'
    case 'workplace':
      return 'min-w-[8rem]'
    case 'responsiveness':
      return 'min-w-[9.5rem]'
    case 'role':
      return 'min-w-[6rem]'
    default:
      return columnId.startsWith('structure-') ? 'min-w-[7rem]' : undefined
  }
}
