import type { StructureTree } from '@/api/structure'
import { isLocalPhoneComplete } from '@/lib/phone-countries'
import { profileAddressPolicy } from '@/lib/profile-address-policy'
import { getDeepestLayer, nodeById } from '@/lib/structure-tree'

export type MembershipPrimaryAction = 'add-member' | 'generate-join-link'
export type MembershipRosterTab = 'all' | 'pending'

export type JoinLinkPolicyInput = {
  tree: StructureTree
  canManageRoster: boolean
  canManageChurch: boolean
  actorScopeNodeId?: string | null
}

export function canMintJoinLink(input: JoinLinkPolicyInput): boolean {
  if (!input.canManageRoster || input.canManageChurch) return false
  if (!input.actorScopeNodeId) return false
  const deepest = getDeepestLayer(input.tree)
  if (!deepest) return false
  const scopeNode = nodeById(input.tree, input.actorScopeNodeId)
  return scopeNode?.layerId === deepest.id
}

export function membershipPrimaryAction(
  input: JoinLinkPolicyInput,
): MembershipPrimaryAction | null {
  if (!input.canManageRoster) return null
  return canMintJoinLink(input) ? 'generate-join-link' : 'add-member'
}

export function canShowPendingMembersTab(input: JoinLinkPolicyInput): boolean {
  return canMintJoinLink(input)
}

export function canSubmitJoinVitals(input: {
  name: string
  email: string
  phoneDialCode: string
  phoneLocal: string
  dateOfBirth: string
  state: string
  countryCode?: string | null
}): boolean {
  const address = profileAddressPolicy(input.countryCode)
  return (
    input.name.trim().length > 0 &&
    input.email.trim().includes('@') &&
    isLocalPhoneComplete(input.phoneDialCode, input.phoneLocal) &&
    input.dateOfBirth.trim().length > 0 &&
    (!address.requireState || input.state.trim().length > 0)
  )
}
