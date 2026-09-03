import type { StructureTree } from '@/api/structure'
import { getDeepestLayer, layerById, nodeById } from '@/lib/structure-tree'

export type MemberWizardStepKind = 'details' | 'cell' | 'placement' | 'responsiveness' | 'education'
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
      return 'Register members church-wide — details, role & placement, and work & study. Email is for church updates, not login.'
  }
}

export function buildCreateStepPlan(
  mode: MemberWizardMode,
  isNewMember: boolean,
  needsCellStep: boolean,
): { labels: readonly string[]; kinds: readonly MemberWizardStepKind[] } {
  const labels: string[] = ['Details']
  const kinds: MemberWizardStepKind[] = ['details']

  if (mode === 'fellowship' && needsCellStep) {
    labels.push('Attach to cell')
    kinds.push('cell')
  }
  if (mode === 'roster') {
    labels.push('Role & placement')
    kinds.push('placement')
  }
  if (!isNewMember && mode !== 'roster') {
    labels.push('Responsiveness')
    kinds.push('responsiveness')
  }
  labels.push('Work & study')
  kinds.push('education')

  return { labels, kinds }
}

export function buildEditStepPlan(
  mode: MemberWizardMode,
  needsCellStep: boolean,
): { labels: readonly string[]; kinds: readonly MemberWizardStepKind[] } {
  const labels: string[] = ['Details']
  const kinds: MemberWizardStepKind[] = ['details']

  if (mode === 'fellowship' && needsCellStep) {
    labels.push('Attach to cell')
    kinds.push('cell')
  }
  if (mode === 'roster') {
    labels.push('Role & placement')
    kinds.push('placement')
  } else {
    labels.push('Responsiveness')
    kinds.push('responsiveness')
  }
  labels.push('Work & study')
  kinds.push('education')

  return { labels, kinds }
}
