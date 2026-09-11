/** Hide remove on the actor’s own membership row. Missing id still allows others. */
export function canRemoveMember(
  actorMemberId: string | null | undefined,
  memberId: string,
): boolean {
  return !actorMemberId || actorMemberId !== memberId
}

export function isPendingRosterStatus(status?: string | null): boolean {
  return status === 'Pending'
}

export function pendingMemberActions(status?: string | null): { accept: boolean; decline: boolean } {
  const pending = isPendingRosterStatus(status)
  return { accept: pending, decline: pending }
}
