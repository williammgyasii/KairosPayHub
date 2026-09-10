import type { MemberPosition } from '@/api/structure'

export type ActorLeadership = 'churchWide' | 'intermediate' | 'leaf' | 'member'

const ASSIGNABLE: Record<ActorLeadership, MemberPosition[]> = {
  churchWide: ['Member', 'CellLeader', 'FellowshipLeader', 'PfccManager'],
  intermediate: ['Member', 'CellLeader'],
  leaf: ['Member'],
  member: [],
}

export function actorLeadershipFromRole(role: string): ActorLeadership {
  if (role === 'Pastor' || role === 'ChurchAdmin') return 'churchWide'
  if (role === 'PFCCManager' || role === 'FellowshipLeader') return 'intermediate'
  if (role === 'CellLeader') return 'leaf'
  return 'member'
}

export function memberRolePolicy(input: {
  actorMemberId?: string | null
  actorRole: string
  subjectMemberId: string
  subjectPosition: MemberPosition
}): {
  canEditPosition: boolean
  assignablePositions: MemberPosition[]
} {
  const assignable = ASSIGNABLE[actorLeadershipFromRole(input.actorRole)]
  const isSelf =
    Boolean(input.actorMemberId) && input.actorMemberId === input.subjectMemberId
  const canManageSubject = assignable.includes(input.subjectPosition)
  if (isSelf || !canManageSubject) {
    return { canEditPosition: false, assignablePositions: [input.subjectPosition] }
  }
  return { canEditPosition: true, assignablePositions: assignable }
}
