import { useMemo, useState } from 'react'
import { useApi } from '@/api/core'
import type { StructureLayer, StructureTree } from '@/api/structure'
import { SearchPicker } from '@/components/structure/search-picker'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { buildMemberRows } from '@/lib/structure-table-rows'
import { memberBelongsToUnit, nodeById, resolveNodeLeader } from '@/lib/structure-tree'

export type ChangeLeadershipTarget = {
  nodeId: string
  nodeName: string
  unitNumber: string
  layer: Pick<StructureLayer, 'id' | 'displayName' | 'standardType'>
}

export function ChangeLeadershipModal({
  tree,
  target,
  busy,
  submit,
  onClose,
}: {
  tree: StructureTree
  target: ChangeLeadershipTarget
  busy: boolean
  submit: (action: () => Promise<void>) => Promise<void>
  onClose: () => void
}) {
  const api = useApi()
  const resolvedLeader = resolveNodeLeader(tree, target.nodeId)
  const hasLeader = Boolean(resolvedLeader.leaderMemberId || resolvedLeader.leaderName)

  const memberOptions = useMemo(
    () =>
      buildMemberRows(tree)
        .filter((member) => memberBelongsToUnit(tree, target.nodeId, member.parentNodeId))
        .filter((member) => member.id !== resolvedLeader.leaderMemberId)
        .map((member) => ({
          id: member.id,
          label: member.member,
          hint: member.structure.map((segment) => segment.nodeName).join(' / ') || member.path,
        })),
    [tree, target.nodeId, resolvedLeader.leaderMemberId],
  )

  const [leaderMemberId, setLeaderMemberId] = useState('')
  const node = nodeById(tree, target.nodeId)
  const canSubmit = Boolean(leaderMemberId)

  return (
    <Modal
      open
      onOpenChange={(open) => !open && onClose()}
      title="Change leadership"
      description={`Choose an active member under ${target.nodeName} to lead this unit.`}
      size="lg"
    >
      {memberOptions.length === 0 ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {hasLeader
              ? 'No other active members under this unit yet. Register members first, then return here to assign a new leader.'
              : 'No active members under this unit yet. Register members first, then return here to assign a leader.'}
          </p>
          <div className="flex justify-end border-t pt-4">
            <Button type="button" variant="ghost" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      ) : (
        <form
          className="grid gap-5"
          onSubmit={(e) => {
            e.preventDefault()
            if (!node || !canSubmit) return

            void submit(async () => {
              await api.patch(`/api/structure/nodes/${target.nodeId}`, {
                name: node.name,
                unitNumber: node.unitNumber || null,
                leaderMemberId,
              })
              onClose()
            })
          }}
        >
          {hasLeader && (
            <div className="rounded-lg border border-border/60 bg-muted/10 px-3 py-2.5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Current leader
              </p>
              <p className="mt-1 text-sm font-medium">
                {resolvedLeader.leaderName || 'Assigned leader'}
              </p>
            </div>
          )}

          <section className="space-y-3">
            <div>
              <p className="text-sm font-medium">{hasLeader ? 'New leader' : 'Leader'}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Pick an active member already registered under this unit.
              </p>
            </div>

            <SearchPicker
              options={memberOptions}
              value={leaderMemberId}
              onChange={setLeaderMemberId}
              placeholder="Search members by name or cell…"
              emptyMessage="No members match your search."
              required
            />
          </section>

          <div className="flex justify-end gap-2 border-t pt-4">
            <Button type="button" variant="ghost" disabled={busy} onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={busy} loadingLabel="Saving…" disabled={!canSubmit}>
              Save leader
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
