import type { StructureLayer } from '@/api/structure'
import { MEMBER_OCCUPATION_OPTIONS, MEMBER_POSITION_OPTIONS } from '@/api/structure'
import type { StructureMemberRow } from '@/lib/structure-table-rows'

export type MemberFilterOperator =
  | 'contains'
  | 'is'
  | 'is_not'
  | 'is_empty'
  | 'is_not_empty'

export type MemberFilterField =
  | 'name'
  | 'email'
  | 'phone'
  | 'residence'
  | 'work'
  | 'occupation'
  | 'role'
  | 'age'
  | `layer:${string}`

export type MemberFilterRule = {
  id: string
  field: MemberFilterField | null
  operator: MemberFilterOperator
  value: string
}

export type MemberFilterFieldDef = {
  field: MemberFilterField
  label: string
  kind: 'text' | 'enum' | 'layer'
}

let ruleCounter = 0

export function createMemberFilterRule(field?: MemberFilterField): MemberFilterRule {
  ruleCounter += 1
  const defaultOperator: MemberFilterOperator =
    field === 'occupation' || field === 'role' || field?.startsWith('layer:')
      ? 'is'
      : 'contains'

  return {
    id: `filter-${ruleCounter}`,
    field: field ?? null,
    operator: defaultOperator,
    value: '',
  }
}

export function buildMemberFilterFields(
  layers: Pick<StructureLayer, 'id' | 'displayName' | 'standardType'>[],
): MemberFilterFieldDef[] {
  return [
    { field: 'name', label: 'Name', kind: 'text' },
    { field: 'email', label: 'Email', kind: 'text' },
    { field: 'phone', label: 'Phone', kind: 'text' },
    { field: 'residence', label: 'Residence', kind: 'text' },
    { field: 'work', label: 'School / work', kind: 'text' },
    { field: 'occupation', label: 'Occupation', kind: 'enum' },
    { field: 'role', label: 'Role', kind: 'enum' },
    { field: 'age', label: 'Age', kind: 'text' },
    ...buildStructureFilterFields(layers),
  ]
}

export function buildStructureFilterFields(
  layers: Pick<StructureLayer, 'id' | 'displayName' | 'standardType'>[],
): MemberFilterFieldDef[] {
  return layers.map((layer) => ({
    field: `layer:${layer.id}` as MemberFilterField,
    label: layer.displayName,
    kind: 'layer' as const,
  }))
}

export function operatorsForField(field: MemberFilterField | null): MemberFilterOperator[] {
  if (!field) return ['contains', 'is', 'is_not', 'is_empty', 'is_not_empty']
  if (field === 'occupation' || field === 'role' || field.startsWith('layer:')) {
    return ['is', 'is_not']
  }
  return ['contains', 'is', 'is_not', 'is_empty', 'is_not_empty']
}

export function operatorLabel(operator: MemberFilterOperator) {
  switch (operator) {
    case 'contains':
      return 'contains'
    case 'is':
      return 'is'
    case 'is_not':
      return 'is not'
    case 'is_empty':
      return 'is empty'
    case 'is_not_empty':
      return 'is not empty'
  }
}

export function applyMemberFilterRules(
  rows: StructureMemberRow[],
  rules: MemberFilterRule[],
): StructureMemberRow[] {
  const active = rules.filter((rule) => ruleApplies(rule))
  if (active.length === 0) return rows
  return rows.filter((row) => active.every((rule) => rowMatchesRule(row, rule)))
}

function ruleApplies(rule: MemberFilterRule) {
  if (!rule.field) return false
  if (rule.operator === 'is_empty' || rule.operator === 'is_not_empty') return true
  return rule.value.trim().length > 0
}

function rowMatchesRule(row: StructureMemberRow, rule: MemberFilterRule) {
  if (!rule.field) return true
  const raw = fieldValue(row, rule.field)
  return matchOperator(raw, rule.operator, rule.value, rule.field)
}

function fieldValue(row: StructureMemberRow, field: MemberFilterField): string {
  if (field.startsWith('layer:')) {
    const layerId = field.slice('layer:'.length)
    return row.structure.find((segment) => segment.layerId === layerId)?.nodeName ?? ''
  }

  switch (field) {
    case 'name':
      return row.member
    case 'email':
      return row.email
    case 'phone':
      return row.phone
    case 'residence':
      return row.residence
    case 'work':
      return row.schoolOrWorkplace
    case 'occupation':
      return row.occupationStatus
    case 'role':
      return row.position
    case 'age':
      return row.age
    default:
      return ''
  }
}

function matchOperator(
  raw: string,
  operator: MemberFilterOperator,
  compareValue: string,
  field: MemberFilterField,
): boolean {
  const value = raw.trim()
  const needle = compareValue.trim()
  const lower = value.toLowerCase()
  const needleLower = needle.toLowerCase()

  switch (operator) {
    case 'is_empty':
      return value.length === 0
    case 'is_not_empty':
      return value.length > 0
    case 'contains':
      return lower.includes(needleLower)
    case 'is':
      return valuesMatch(value, needle, field)
    case 'is_not':
      return !valuesMatch(value, needle, field)
  }
}

function valuesMatch(value: string, needle: string, field: MemberFilterField) {
  const lower = value.toLowerCase()
  const needleLower = needle.toLowerCase()

  if (field === 'occupation') {
    return (
      value === needle ||
      formatOccupationStatus(value).toLowerCase() === needleLower ||
      value.toLowerCase() === needleLower
    )
  }

  if (field === 'role') {
    return (
      value === needle ||
      MEMBER_POSITION_OPTIONS.some(
        (option) =>
          option.value === value &&
          (option.value === needle || option.label.toLowerCase() === needleLower),
      )
    )
  }

  return lower === needleLower
}

export function layerValueOptions(rows: StructureMemberRow[], layerId: string) {
  const values = new Set<string>()
  for (const row of rows) {
    const segment = row.structure.find((s) => s.layerId === layerId)
    if (segment?.nodeName.trim()) values.add(segment.nodeName.trim())
  }
  return [...values].sort((a, b) => a.localeCompare(b))
}

export function textValueSuggestions(
  rows: StructureMemberRow[],
  field: MemberFilterField | null,
) {
  if (!field) return []
  const values = new Set<string>()
  for (const row of rows) {
    const value = fieldValue(row, field).trim()
    if (value) values.add(value)
  }
  return [...values].sort((a, b) => a.localeCompare(b))
}

export function formatOccupationStatus(value: string) {
  if (!value) return '—'
  return MEMBER_OCCUPATION_OPTIONS.find((option) => option.value === value)?.label ?? value
}

export function fieldDefFor(
  fields: MemberFilterFieldDef[],
  field: MemberFilterField,
): MemberFilterFieldDef | undefined {
  return fields.find((item) => item.field === field)
}

export function getActiveFilterRules(rules: MemberFilterRule[]) {
  return rules.filter((rule) => ruleApplies(rule))
}

function memberHaystack(row: StructureMemberRow) {
  return [
    row.member,
    row.email,
    row.phone,
    row.residence,
    row.schoolOrWorkplace,
    row.occupationStatus,
    row.position,
    row.age,
    row.path,
    ...row.structure.map((segment) => segment.nodeName),
  ]
    .join(' ')
    .toLowerCase()
}

export function applyMemberSearch(
  rows: StructureMemberRow[],
  query: string,
  scope: MemberFilterField | 'all',
): StructureMemberRow[] {
  const trimmed = query.trim().toLowerCase()
  if (!trimmed) return rows

  return rows.filter((row) => {
    if (scope === 'all') {
      return memberHaystack(row).includes(trimmed)
    }
    return fieldValue(row, scope).toLowerCase().includes(trimmed)
  })
}

export function describeMemberFilterRule(
  rule: MemberFilterRule,
  fields: MemberFilterFieldDef[],
): string {
  if (!rule.field) return 'Select field…'
  const label = fieldDefFor(fields, rule.field)?.label ?? 'Field'
  const op = operatorLabel(rule.operator)

  if (rule.operator === 'is_empty' || rule.operator === 'is_not_empty') {
    return `${label} ${op}`
  }

  let value = rule.value
  if (rule.field === 'occupation') {
    value = formatOccupationStatus(rule.value)
  }
  if (rule.field === 'role') {
    value =
      MEMBER_POSITION_OPTIONS.find((option) => option.value === rule.value)?.label ?? rule.value
  }

  return `${label} ${op} ${value}`.trim()
}
