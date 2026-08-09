import { useEffect, useMemo, useState } from 'react'
import { useApi } from '@/api/useApi'
import type { CreateStructureNodeResponse, StructureLayer, StructureTree } from '@/api/structure'
import { buildMemberRows } from '@/lib/structure-table-rows'
import type { StructureUnitNodeRow } from '@/lib/structure-table-rows'
import {
  getDeepestLayer,
  getLayers,
  layerById,
  memberBelongsToUnit,
  nextUnitNumberForParent,
  nodeById,
  nodesUnderUnitAtLayer,
  resolveNodeLeader,
} from '@/lib/structure-tree'
import { SearchPicker } from '@/components/structure/search-picker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal } from '@/components/ui/modal'
import {
  LeaderLoginCredentialsModal,
  type GeneratedLeaderLogin,
} from '@/components/structure/leader-login-credentials-modal'
import {
  MemberProfileFields,
  memberProfilePayload,
  isRequiredLeaderProfileComplete,
  type MemberProfileFormValues,
} from '@/components/structure/member-profile-fields'
import { DEFAULT_PHONE_COUNTRY } from '@/lib/phone-countries'
import { cn } from '@/lib/utils'

export type UnitNodeSheetState =
  | { mode: 'create'; layer: StructureLayer; parentNodeId: string }
  | { mode: 'edit'; row: StructureUnitNodeRow; layer: StructureLayer }

type LeaderMode = 'none' | 'existing' | 'new'

export function UnitNodeFormSheet({
  tree,
  unitNodeId,
  busy,
  submit,
  sheet,
  onClose,
}: {
  tree: StructureTree
  unitNodeId: string
  busy: boolean
  submit: (action: () => Promise<void>) => Promise<void>
  sheet: UnitNodeSheetState
  onClose: () => void
}) {
  const isEdit = sheet.mode === 'edit'
  const layer = sheet.layer
  const [generatedLogin, setGeneratedLogin] = useState<GeneratedLeaderLogin | null>(null)
  const [leaderName, setLeaderName] = useState('')

  if (generatedLogin) {
    return (
      <LeaderLoginCredentialsModal
        credentials={generatedLogin}
        leaderName={leaderName}
        onClose={() => {
          setGeneratedLogin(null)
          onClose()
        }}
      />
    )
  }

  return (
    <Modal
      open
      onOpenChange={(open) => !open && onClose()}
      title={isEdit ? `Edit ${layer.displayName}` : `Add ${layer.displayName}`}
      description={
        isEdit
          ? `Update this ${layer.displayName.toLowerCase()} under your structure.`
          : `Create a ${layer.displayName.toLowerCase()} under ${nodeById(tree, unitNodeId)?.name ?? 'this unit'}.`
      }
      size="lg"
    >
      <UnitNodeForm
        tree={tree}
        unitNodeId={unitNodeId}
        layer={layer}
        row={isEdit ? sheet.row : undefined}
        parentNodeId={isEdit ? undefined : sheet.parentNodeId}
        busy={busy}
        onCancel={onClose}
        submit={submit}
        onLeaderLoginGenerated={(login, name) => {
          setLeaderName(name)
          setGeneratedLogin(login)
        }}
      />
    </Modal>
  )
}

function UnitNodeForm({
  tree,
  unitNodeId,
  layer,
  row,
  parentNodeId,
  busy,
  onCancel,
  submit,
  onLeaderLoginGenerated,
}: {
  tree: StructureTree
  unitNodeId: string
  layer: StructureLayer
  row?: StructureUnitNodeRow
  parentNodeId?: string
  busy: boolean
  onCancel: () => void
  submit: (action: () => Promise<void>) => Promise<void>
  onLeaderLoginGenerated?: (login: GeneratedLeaderLogin, leaderName: string) => void
}) {
  const api = useApi()
  const deepest = getDeepestLayer(tree)
  const isDeepest = deepest?.id === layer.id
  const memberOptions = useMemo(
    () =>
      buildMemberRows(tree)
        .filter((member) => memberBelongsToUnit(tree, unitNodeId, member.parentNodeId))
        .map((member) => ({
          id: member.id,
          label: member.member,
          hint: member.structure.map((segment) => segment.nodeName).join(' / ') || member.path,
        })),
    [tree, unitNodeId],
  )
  const unit = nodeById(tree, unitNodeId)
  const unitLayer = unit ? layerById(tree, unit.layerId) : undefined
  const parentLayer = layer.sortOrder > 0 ? getLayers(tree)[layer.sortOrder - 1] : undefined
  const parentOptions = useMemo(() => {
    if (!unit || !unitLayer || !parentLayer) return []
    if (layer.sortOrder === unitLayer.sortOrder + 1) {
      return [{ id: unit.id, label: unit.name }]
    }
    return nodesUnderUnitAtLayer(tree, unit.id, parentLayer.id).map((node) => ({
      id: node.id,
      label: node.name,
    }))
  }, [tree, unit, unitLayer, parentLayer, layer.sortOrder])

  const defaultParentId =
    parentNodeId ??
    parentOptions[0]?.id ??
    (unitLayer && layer.sortOrder === unitLayer.sortOrder + 1 ? unitNodeId : '')

  const resolvedLeader = row ? resolveNodeLeader(tree, row.id) : { leaderMemberId: '', leaderName: '' }
  const lockedLeaderId = resolvedLeader.leaderMemberId
  const hasLockedLeader = Boolean(row && (lockedLeaderId || resolvedLeader.leaderName))

  const [name, setName] = useState(row?.name ?? '')
  const [unitNumber, setUnitNumber] = useState(row?.unitNumber ?? '')
  const [selectedParentId, setSelectedParentId] = useState(defaultParentId)
  const [leaderMode, setLeaderMode] = useState<LeaderMode>('none')
  const [leaderMemberId, setLeaderMemberId] = useState('')
  const [newLeaderName, setNewLeaderName] = useState('')
  const [newLeaderEmail, setNewLeaderEmail] = useState('')
  const [newLeaderProfile, setNewLeaderProfile] = useState<MemberProfileFormValues>({
    phoneDialCode: DEFAULT_PHONE_COUNTRY.dialCode,
    phoneLocal: '',
    dateOfBirth: '',
    residence: '',
    occupationStatus: '',
    schoolOrWorkplace: '',
  })
  const [initialCellName, setInitialCellName] = useState('')

  const autoUnitNumber = useMemo(() => {
    if (row) return null
    const parentId = selectedParentId || defaultParentId || null
    return nextUnitNumberForParent(tree, layer.id, parentId)
  }, [row, tree, layer.id, selectedParentId, defaultParentId])

  useEffect(() => {
    setName(row?.name ?? '')
    setUnitNumber(row?.unitNumber ?? '')
    setSelectedParentId(defaultParentId)
    setLeaderMode('none')
    setLeaderMemberId('')
    setNewLeaderName('')
    setNewLeaderEmail('')
    setNewLeaderProfile({
      phoneDialCode: DEFAULT_PHONE_COUNTRY.dialCode,
      phoneLocal: '',
      dateOfBirth: '',
      residence: '',
      occupationStatus: '',
      schoolOrWorkplace: '',
    })
    setInitialCellName('')
  }, [row, defaultParentId])

  const numberLabel = `${layer.displayName} number`
  const newLeaderReady =
    newLeaderName.trim().length > 0 &&
    isRequiredLeaderProfileComplete(newLeaderEmail, newLeaderProfile)
  const canSubmit =
    name.trim().length > 0 &&
    (leaderMode !== 'new' || newLeaderReady) &&
    (leaderMode !== 'existing' || Boolean(leaderMemberId))

  return (
    <form
      className="grid gap-5"
      onSubmit={(e) => {
        e.preventDefault()
        void submit(async () => {
          const resolvedUnitNumber = row
            ? unitNumber || null
            : autoUnitNumber != null
              ? String(autoUnitNumber)
              : null
          const payload = hasLockedLeader
            ? {
                name,
                unitNumber: resolvedUnitNumber,
                leaderMemberId: lockedLeaderId || null,
              }
            : {
                name,
                unitNumber: resolvedUnitNumber,
                leaderMemberId: leaderMode === 'existing' ? leaderMemberId || null : null,
                newLeader:
                  leaderMode === 'new' && newLeaderName.trim()
                    ? (() => {
                        const profile = memberProfilePayload(newLeaderProfile)
                        return {
                          name: newLeaderName,
                          email: newLeaderEmail.trim(),
                          phone: profile.phone,
                          dateOfBirth: profile.dateOfBirth,
                          residence: profile.residence,
                          occupationStatus: profile.occupationStatus,
                          schoolOrWorkplace: profile.schoolOrWorkplace,
                          initialCellName: !isDeepest ? initialCellName || null : null,
                        }
                      })()
                    : null,
              }

          if (row) {
            await api.patch(`/api/structure/nodes/${row.id}`, payload)
            onCancel()
          } else {
            const response = await api.post<CreateStructureNodeResponse>('/api/structure/nodes', {
              layerId: layer.id,
              parentNodeId: selectedParentId || null,
              ...payload,
            })
            if (response.generatedLeaderLogin && onLeaderLoginGenerated) {
              onLeaderLoginGenerated(response.generatedLeaderLogin, newLeaderName.trim())
            } else {
              onCancel()
            }
          }
        })
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={`${layer.displayName} name`} id="unit-name">
          <Input id="unit-name" value={name} onChange={(e) => setName(e.target.value)} required />
        </Field>

        <Field label={numberLabel} id="unit-number">
          <Input
            id="unit-number"
            value={row ? unitNumber : String(autoUnitNumber ?? '')}
            onChange={(e) => setUnitNumber(e.target.value)}
            readOnly={!row}
            className={!row ? 'bg-muted/40 text-muted-foreground' : undefined}
          />
        </Field>
      </div>

      {!row && parentOptions.length > 1 && parentLayer && (
        <Field label={`Parent ${parentLayer.displayName}`} id="unit-parent">
          <select
            id="unit-parent"
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={selectedParentId}
            onChange={(e) => setSelectedParentId(e.target.value)}
            required
          >
            <option value="">Select…</option>
            {parentOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
      )}

      <section className="space-y-3 rounded-lg border border-border/60 bg-muted/10 p-4">
        <div>
          <p className="text-sm font-medium">Leader</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {hasLockedLeader
              ? 'This unit already has a leader assigned.'
              : 'Optional. Search existing members or register someone new with login credentials.'}
          </p>
        </div>

        {hasLockedLeader ? (
          <div className="rounded-md border border-border/60 bg-background px-3 py-2.5">
            <p className="text-sm font-medium">{resolvedLeader.leaderName || 'Assigned leader'}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Leader cannot be changed from this form. Update the member profile from Membership if
              needed.
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { id: 'none', label: 'No leader' },
                  { id: 'existing', label: 'Pick member', disabled: memberOptions.length === 0 },
                  { id: 'new', label: 'New person' },
                ] as const
              ).map((option) => (
                <button
                  key={option.id}
                  type="button"
                  disabled={'disabled' in option && option.disabled}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                    leaderMode === option.id
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border/60 text-muted-foreground hover:bg-accent/60 hover:text-foreground',
                    'disabled' in option && option.disabled && 'opacity-40',
                  )}
                  onClick={() => setLeaderMode(option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {leaderMode === 'existing' && (
              <SearchPicker
                options={memberOptions}
                value={leaderMemberId}
                onChange={setLeaderMemberId}
                placeholder="Search members by name or cell…"
                emptyMessage="No members match your search."
                required
              />
            )}

            {leaderMode === 'new' && (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Leader name" id="new-leader-name" required>
                    <Input
                      id="new-leader-name"
                      value={newLeaderName}
                      onChange={(e) => setNewLeaderName(e.target.value)}
                      required
                    />
                  </Field>
                  <Field label="Leader email" id="new-leader-email" required>
                    <Input
                      id="new-leader-email"
                      type="email"
                      value={newLeaderEmail}
                      onChange={(e) => setNewLeaderEmail(e.target.value)}
                      placeholder="For login credentials"
                      required
                    />
                  </Field>
                  {!isDeepest && (
                    <Field
                      label={`First ${deepest?.displayName ?? 'cell'} name`}
                      id="initial-cell"
                      className="sm:col-span-2"
                    >
                      <Input
                        id="initial-cell"
                        value={initialCellName}
                        onChange={(e) => setInitialCellName(e.target.value)}
                        placeholder={`Optional — defaults to “${name || layer.displayName} Cell”`}
                      />
                    </Field>
                  )}
                </div>
                <MemberProfileFields
                  phoneId="new-leader-phone"
                  values={newLeaderProfile}
                  onChange={(patch) => setNewLeaderProfile((current) => ({ ...current, ...patch }))}
                  requirePhoneAndDob
                />
              </>
            )}
          </>
        )}
      </section>

      <div className="flex justify-end gap-2 border-t pt-4">
        <Button type="button" variant="ghost" disabled={busy} onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          loading={busy}
          loadingLabel={row ? 'Saving…' : 'Adding…'}
          disabled={!canSubmit}
        >
          {row ? 'Save changes' : `Add ${layer.displayName.toLowerCase()}`}
        </Button>
      </div>
    </form>
  )
}

function Field({
  label,
  id,
  children,
  className,
  required = false,
}: {
  label: string
  id: string
  children: React.ReactNode
  className?: string
  required?: boolean
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={id} className="text-xs font-medium">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      {children}
    </div>
  )
}
