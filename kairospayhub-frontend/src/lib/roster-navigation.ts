export function rosterUnitMembersUrl(unitId: string, preset?: 'leaders') {
  const params = new URLSearchParams({ tab: 'members' })
  if (preset) params.set('preset', preset)
  return `/roster/units/${unitId}?${params.toString()}`
}

export function rosterUnitLayerUrl(unitId: string, layerId: string) {
  const params = new URLSearchParams({ tab: layerId })
  return `/roster/units/${unitId}?${params.toString()}`
}

export function rosterUnitViewLayerLabel(displayName: string) {
  return `View ${displayName.toLowerCase()}`
}
