import type { StructureTree } from '@/api/structure'
import { getDeepestLayer, layerById, nodeById } from '@/shared/lib/structure-tree'

export type MemberWizardStepKind =
  | 'details'
  | 'personal'
  | 'cell'
  | 'placement'
  | 'responsiveness'
  | 'education'
export type MemberWizardMode = 'cell' | 'fellowship' | 'roster'

/** Where the member form was opened from — drives which wizard steps appear. */
export function resolveMemberWizardMode(
  tree: StructureTree,
  unitNodeId?: string | null,
): MemberWizardMode {
  if (!unitNodeId) return 'roster'

  const unit = nodeById(tree, unitNodeId)
  const deepest = getDeepestLayer(tree)
  if (!unit || !deepest) return 'roster'

  if (unit.layerId === deepest.id) return 'cell'

  const layer = layerById(tree, unit.layerId)
  if (layer?.standardType === 'Fellowship') return 'fellowship'

  return 'roster'
}

export function membershipPageDescription(
  mode: MemberWizardMode,
  scopeLabel: string | null,
  canManage: boolean,
): string {
  if (!canManage) {
    return scopeLabel ? `Members registered under ${scopeLabel}.` : 'Members in your scope.'
  }

  switch (mode) {
    case 'cell':
      return `Add people to ${scopeLabel ?? 'your cell'}. Collect details and work info — they're placed in this cell automatically.`
    case 'fellowship':
      return `Add people under ${scopeLabel ?? 'your fellowship'}. Details first, then attach to a cell when needed, then work & study.`
    default:
      return 'Register members church-wide — details, birthday, role & placement, and work & study. Email is optional until members have a login.'
  }
}

export function buildCreateStepPlan(
  mode: MemberWizardMode,
  needsCellStep: boolean,
): { labels: readonly string[]; kinds: readonly MemberWizardStepKind[] } {
  const labels: string[] = ['Details', 'Personal']
  const kinds: MemberWizardStepKind[] = ['details', 'personal']

  if (mode === 'fellowship' && needsCellStep) {
    labels.push('Attach to cell')
    kinds.push('cell')
  }
  if (mode === 'roster') {
    labels.push('Role & placement')
    kinds.push('placement')
  }
  labels.push('Work & study')
  kinds.push('education')

  return { labels, kinds }
}

export function buildEditStepPlan(
  _mode?: MemberWizardMode,
  _needsCellStep?: boolean,
): { labels: readonly string[]; kinds: readonly MemberWizardStepKind[] } {
  return { labels: ['Details'], kinds: ['details'] }
}
