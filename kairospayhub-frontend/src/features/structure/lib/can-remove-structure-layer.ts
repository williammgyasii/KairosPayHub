export function canRemoveStructureLayer(
  layers: readonly unknown[],
  index: number,
): boolean {
  if (layers.length <= 1) return false
  if (index < 0 || index >= layers.length) return false
  return index !== layers.length - 1
}

export function structureLayerRemoveIntent(hasRoster: boolean): 'saveWithoutLayer' | 'offerReset' {
  return hasRoster ? 'offerReset' : 'saveWithoutLayer'
}
