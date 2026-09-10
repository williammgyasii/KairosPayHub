export type ReceiveGivingsOnMainPolicy = {
  label: string
  helpText: string
  receiveOnMain: boolean
  requiresFirstSubOnCreate: boolean
  canLogOnProgram: boolean
}

const LABEL = 'Receive givings on main campaign?'
const HELP_ON =
  'On: leaders can log givings on this main campaign and on any sub-campaigns. Totals still roll up to the main.'
const HELP_OFF =
  'Off: this campaign is a container — leaders log only on sub-campaigns. Totals from subs still roll up to the main.'

export function receiveGivingsOnMainPolicy(input: {
  receiveGivingsOnMain: boolean
  isRoot: boolean
  acceptsContributions: boolean
  forCreate?: boolean
}): ReceiveGivingsOnMainPolicy {
  const receiveOnMain = input.forCreate
    ? input.receiveGivingsOnMain
    : input.isRoot
      ? input.receiveGivingsOnMain
      : true

  const canLogOnProgram =
    input.acceptsContributions && (input.isRoot ? receiveOnMain : true)

  return {
    label: LABEL,
    helpText: receiveOnMain ? HELP_ON : HELP_OFF,
    receiveOnMain,
    requiresFirstSubOnCreate: Boolean(input.forCreate && !receiveOnMain),
    canLogOnProgram,
  }
}
