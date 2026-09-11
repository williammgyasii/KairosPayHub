export type AccessAbilityColumn = {
  id: string
  label: string
}

export type AccessCell = {
  ability: string
  defaultOn: boolean
  effectiveOn: boolean
  locked: boolean
}

export type AccessRow = {
  subjectKind: string
  subjectId: string | null
  label: string
  cells: AccessCell[]
}

export type AccessGrid = {
  abilities: AccessAbilityColumn[]
  rows: AccessRow[]
}

export type AccessChange = {
  subjectKind: string
  subjectId: string | null
  ability: string
  enabled: boolean
}
