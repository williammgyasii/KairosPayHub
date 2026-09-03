export type MemberWizardStepKind = 'details' | 'cell' | 'placement' | 'responsiveness' | 'education'
export type MemberWizardMode = 'cell' | 'fellowship' | 'roster'

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
