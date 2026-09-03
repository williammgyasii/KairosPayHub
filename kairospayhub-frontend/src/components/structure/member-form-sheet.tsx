import type { StructureTree } from '@/api/structure'
import { MemberCreateWizard } from '@/components/structure/member-create-wizard'
import { MemberEditWizard } from '@/components/structure/member-edit-wizard'
import type { StructureMemberRow } from '@/lib/structure-table-rows'

export type MemberSheetState =
  | { mode: 'create' }
  | { mode: 'edit'; member: StructureMemberRow }

export function MemberFormSheet({
  tree,
  unitNodeId,
  busy,
  submit,
  sheet,
  onClose,
}: {
  tree: StructureTree
  unitNodeId?: string
  busy: boolean
  submit: (action: () => Promise<void>) => Promise<void>
  sheet: MemberSheetState
  onClose: () => void
}) {
  if (sheet.mode === 'create') {
    return (
      <MemberCreateWizard
        tree={tree}
        unitNodeId={unitNodeId}
        busy={busy}
        submit={submit}
        onClose={onClose}
      />
    )
  }

  return (
    <MemberEditWizard
      tree={tree}
      unitNodeId={unitNodeId}
      member={sheet.member}
      busy={busy}
      submit={submit}
      onClose={onClose}
    />
  )
}
