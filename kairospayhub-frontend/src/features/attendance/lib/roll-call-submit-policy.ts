import type { RollCallScope } from '@/api/auth'

export type RollCallMeetingType = {
  id: string
  submissionLayerId?: string | null
  submissionLayerName?: string | null
}

export function markableMeetingTypes<T extends RollCallMeetingType>(
  types: T[],
  scopes: RollCallScope[],
): T[] {
  return types.filter((type) => rollCallScopesForMeeting(scopes, type).length > 0)
}

export function rollCallScopesForMeeting(
  scopes: RollCallScope[],
  type: Pick<RollCallMeetingType, 'submissionLayerId' | 'submissionLayerName'>,
): RollCallScope[] {
  return scopes.filter((scope) => {
    if (type.submissionLayerId && scope.layerId)
      return scope.layerId === type.submissionLayerId
    if (type.submissionLayerName && scope.layerName)
      return scope.layerName === type.submissionLayerName
    return false
  })
}
