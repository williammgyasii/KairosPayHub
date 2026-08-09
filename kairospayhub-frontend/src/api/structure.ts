export type StructureLayerType = 'Group' | 'PFCC' | 'Fellowship' | 'Cell'

export type StructureLayer = {
  id: string
  sortOrder: number
  standardType: StructureLayerType
  displayName: string
}

export type StructureTemplate = {
  id: string
  name: string
  layers: StructureLayer[]
}

export type StructureNode = {
  id: string
  layerId: string
  parentNodeId: string | null
  name: string
  unitNumber: string | null
  leaderMemberId: string | null
  leaderName: string | null
}

export type MemberPosition = 'Member' | 'CellLeader' | 'FellowshipLeader' | 'PfccManager'

export const MEMBER_POSITION_OPTIONS: { value: MemberPosition; label: string }[] = [
  { value: 'Member', label: 'Member' },
  { value: 'CellLeader', label: 'Cell leader' },
  { value: 'FellowshipLeader', label: 'Fellowship leader' },
  { value: 'PfccManager', label: 'PFCC manager' },
]

export type MemberOccupationStatus =
  | 'Student'
  | 'Working'
  | 'StudentAndWorking'
  | 'Unemployed'
  | 'Other'

export const MEMBER_OCCUPATION_OPTIONS: { value: MemberOccupationStatus; label: string }[] = [
  { value: 'Student', label: 'Student' },
  { value: 'Working', label: 'Working' },
  { value: 'StudentAndWorking', label: 'Student & working' },
  { value: 'Unemployed', label: 'Unemployed' },
  { value: 'Other', label: 'Other' },
]

export type StructureMember = {
  id: string
  parentNodeId: string
  name: string
  email: string | null
  phone: string | null
  age: number | null
  dateOfBirth: string | null
  residence: string | null
  occupationStatus: MemberOccupationStatus | string | null
  schoolOrWorkplace: string | null
  position: MemberPosition | string
  responsiveness: number
}

export type StructureTree = {
  churchId: string
  churchName: string
  template: StructureTemplate | null
  nodes: StructureNode[]
  members: StructureMember[]
}

export type StructureMemberListParams = {
  page?: number
  pageSize?: number
  sortBy?: 'name' | 'email' | 'phone' | 'age' | 'position' | 'createdAt'
  sortDir?: 'asc' | 'desc'
  search?: string
  parentNodeId?: string
  includeDescendants?: boolean
}

export type StructureMemberListResponse = {
  items: StructureMember[]
  totalCount: number
  page: number
  pageSize: number
}

export function buildMembersQuery(params: StructureMemberListParams): string {
  const qs = new URLSearchParams()
  if (params.page != null) qs.set('page', String(params.page))
  if (params.pageSize != null) qs.set('pageSize', String(params.pageSize))
  if (params.sortBy) qs.set('sortBy', params.sortBy)
  if (params.sortDir) qs.set('sortDir', params.sortDir)
  if (params.search) qs.set('search', params.search)
  if (params.parentNodeId) qs.set('parentNodeId', params.parentNodeId)
  if (params.includeDescendants != null) {
    qs.set('includeDescendants', String(params.includeDescendants))
  }
  const query = qs.toString()
  return query ? `?${query}` : ''
}

export type GeneratedLeaderLogin = {
  email: string
  temporaryPassword: string
}

export type CreateStructureNodeResponse = {
  node: StructureNode
  generatedLeaderLogin: GeneratedLeaderLogin | null
}

export type StructureLayerInput = {
  standardType: StructureLayerType
  displayName: string
}

export type StructureEvolvePreview = {
  summary: string
  bridgeNodesCreated: number
  nodesReparented: number
  membersMoved: number
  details: string[]
}

export type EvolveStructureTemplateResponse = {
  template: StructureTemplate | null
  preview: StructureEvolvePreview
  applied: boolean
}

export type EvolveStructureTemplateRequest = {
  operation: 'rename' | 'appendTop' | 'insertAt' | 'appendBeforeMember'
  name?: string | null
  layer?: StructureLayerInput
  atSortOrder?: number
  layers?: StructureLayerInput[]
  dryRun?: boolean
}

export const TEMPLATE_PRESETS: {
  id: string
  label: string
  description: string
  layers: StructureLayerInput[]
}[] = [
  {
    id: 'standard',
    label: 'Standard',
    description: 'PFCC → Fellowship → Cell',
    layers: [
      { standardType: 'PFCC', displayName: 'PFCC' },
      { standardType: 'Fellowship', displayName: 'Fellowship' },
      { standardType: 'Cell', displayName: 'Cell' },
    ],
  },
  {
    id: 'with-group',
    label: 'With groups',
    description: 'Group → PFCC → Fellowship → Cell',
    layers: [
      { standardType: 'Group', displayName: 'Group' },
      { standardType: 'PFCC', displayName: 'PFCC' },
      { standardType: 'Fellowship', displayName: 'Fellowship' },
      { standardType: 'Cell', displayName: 'Cell' },
    ],
  },
  {
    id: 'flat',
    label: 'Flat',
    description: 'Fellowship → Cell (no PFCC)',
    layers: [
      { standardType: 'Fellowship', displayName: 'Fellowship' },
      { standardType: 'Cell', displayName: 'Cell' },
    ],
  },
]

export const LAYER_TYPE_OPTIONS: StructureLayerType[] = [
  'Group',
  'PFCC',
  'Fellowship',
  'Cell',
]
