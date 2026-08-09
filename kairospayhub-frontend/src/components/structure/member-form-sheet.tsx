import { useEffect, useMemo, useState } from 'react'
import { GitBranch, GraduationCap, User, type LucideIcon } from 'lucide-react'
import { useApi } from '@/api/useApi'
import {
  MEMBER_POSITION_OPTIONS,
  type MemberPosition,
  type StructureTree,
} from '@/api/structure'
import { MEMBER_RESPONSIVENESS_OPTIONS } from '@/lib/member-responsiveness'
import type { StructureMemberRow } from '@/lib/structure-table-rows'
import {
  defaultMemberPlacementForUnit,
  getDeepestLayer,
  memberPlacementOptions,
  placementOptionsForUnit,
} from '@/lib/structure-tree'
import {
  MemberProfileFields,
  memberProfileInitialValues,
  memberProfilePayload,
  type MemberProfileFormValues,
} from '@/components/structure/member-profile-fields'
import { SearchPicker } from '@/components/structure/search-picker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal } from '@/components/ui/modal'
import { cn } from '@/lib/utils'

export type MemberSheetState =
  | { mode: 'create' }
  | { mode: 'edit'; member: StructureMemberRow }

type MemberFormTab = 'profile' | 'placement' | 'education'

const FORM_TABS: { id: MemberFormTab; label: string; icon: LucideIcon }[] = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'placement', label: 'Role & placement', icon: GitBranch },
  { id: 'education', label: 'Work & study', icon: GraduationCap },
]

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
  const isEdit = sheet.mode === 'edit'
  const deepest = getDeepestLayer(tree)

  return (
    <Modal
      open
      onOpenChange={(open) => !open && onClose()}
      title={isEdit ? 'Edit member' : 'Add member'}
      description={
        isEdit
          ? 'Update profile details or move this person to another roster unit.'
          : unitNodeId
            ? `Register someone under a ${deepest?.displayName ?? 'cell'} in this unit.`
            : `Register someone under a ${deepest?.displayName ?? 'roster unit'} in your structure.`
      }
      size="xl"
    >
      <MemberForm
        tree={tree}
        unitNodeId={unitNodeId}
        busy={busy}
        member={isEdit ? sheet.member : undefined}
        onCancel={onClose}
        submit={submit}
      />
    </Modal>
  )
}

function MemberForm({
  tree,
  unitNodeId,
  busy,
  member,
  onCancel,
  submit,
}: {
  tree: StructureTree
  unitNodeId?: string
  busy: boolean
  member?: StructureMemberRow
  onCancel: () => void
  submit: (action: () => Promise<void>) => Promise<void>
}) {
  const api = useApi()
  const deepest = getDeepestLayer(tree)
  const placements = unitNodeId
    ? placementOptionsForUnit(tree, unitNodeId)
    : memberPlacementOptions(tree)
  const placementOptions = useMemo(
    () =>
      placements.map((placement) => ({
        id: placement.id,
        label: placement.label.split(' / ').pop() ?? placement.label,
        hint: placement.label,
      })),
    [placements],
  )
  const isEdit = Boolean(member)
  const createDefaultParent = unitNodeId
    ? defaultMemberPlacementForUnit(tree, unitNodeId)
    : ''

  const [tab, setTab] = useState<MemberFormTab>('profile')
  const [name, setName] = useState(member?.member ?? '')
  const [email, setEmail] = useState(member?.email ?? '')
  const [profile, setProfile] = useState<MemberProfileFormValues>(() =>
    memberProfileInitialValues(member),
  )
  const [position, setPosition] = useState<MemberPosition>(member?.position ?? 'Member')
  const [responsiveness, setResponsiveness] = useState(member?.responsiveness ?? 3)
  const [parentNodeId, setParentNodeId] = useState(member?.parentNodeId ?? createDefaultParent)

  useEffect(() => {
    setTab('profile')
    setName(member?.member ?? '')
    setEmail(member?.email ?? '')
    setProfile(memberProfileInitialValues(member))
    setPosition(member?.position ?? 'Member')
    setResponsiveness(member?.responsiveness ?? 3)
    setParentNodeId(member?.parentNodeId ?? createDefaultParent)
  }, [member, createDefaultParent])

  if (placements.length === 0) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {unitNodeId
            ? `Add ${deepest?.displayName ?? 'cells'} under this unit first, then return here.`
            : `Add ${deepest?.displayName ?? 'org units'} in Roster first, then return here.`}
        </p>
        <div className="flex justify-end">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Close
          </Button>
        </div>
      </div>
    )
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!name.trim()) {
      setTab('profile')
      return
    }
    if (!parentNodeId) {
      setTab('placement')
      return
    }

    void submit(async () => {
      const profilePayload = memberProfilePayload(profile)
      const payload = isEdit
        ? {
            name,
            ...profilePayload,
            position,
            parentNodeId,
            responsiveness,
          }
        : {
            name,
            email: email.trim() || null,
            ...profilePayload,
            position,
            parentNodeId,
            responsiveness,
          }

      if (isEdit && member) {
        await api.patch(`/api/structure/members/${member.id}`, payload)
      } else {
        await api.post('/api/structure/members', payload)
      }
      onCancel()
    })
  }

  return (
    <form className="grid w-full min-w-0 gap-5" onSubmit={handleSubmit}>
      <nav className="-mx-1 flex gap-1 overflow-x-auto border-b border-border/60 px-1 pb-px">
        {FORM_TABS.map((item) => {
          const active = tab === item.id
          const Icon = item.icon
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={cn(
                'inline-flex shrink-0 items-center gap-1.5 border-b-2 px-2.5 py-2 text-sm font-medium transition-colors',
                active
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="size-3.5" />
              {item.label}
            </button>
          )
        })}
      </nav>

      {tab === 'profile' && (
        <div className="grid w-full min-w-0 gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" id="member-name">
              <Input
                id="member-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </Field>

            <Field label="Email" id="member-email">
              {isEdit ? (
                <>
                  <Input
                    id="member-email"
                    type="email"
                    value={email}
                    readOnly
                    className="bg-muted/40 text-muted-foreground"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    {email
                      ? 'Login email cannot be changed here.'
                      : 'No login email on file.'}
                  </p>
                </>
              ) : (
                <Input
                  id="member-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Optional"
                />
              )}
            </Field>
          </div>

          <MemberProfileFields
            phoneId="member-phone"
            values={profile}
            onChange={(patch) => setProfile((current) => ({ ...current, ...patch }))}
            sections={['contact', 'personal']}
          />
        </div>
      )}

      {tab === 'placement' && (
        <div className="grid w-full min-w-0 gap-4 sm:grid-cols-2">
          <Field label="Role" id="member-role">
            <select
              id="member-role"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={position}
              onChange={(e) => setPosition(e.target.value as MemberPosition)}
            >
              {MEMBER_POSITION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Responsiveness" id="member-responsiveness">
            <select
              id="member-responsiveness"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={responsiveness}
              onChange={(e) => setResponsiveness(Number(e.target.value))}
            >
              {MEMBER_RESPONSIVENESS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.value} — {option.label}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label={`Placed under (${deepest?.displayName ?? 'unit'})`}
            id="member-parent"
            className="sm:col-span-2"
          >
            <SearchPicker
              options={placementOptions}
              value={parentNodeId}
              onChange={setParentNodeId}
              placeholder={`Search ${deepest?.displayName.toLowerCase() ?? 'units'}…`}
              emptyMessage="No roster units match your search."
              required
            />
          </Field>
        </div>
      )}

      {tab === 'education' && (
        <MemberProfileFields
          phoneId="member-phone"
          values={profile}
          onChange={(patch) => setProfile((current) => ({ ...current, ...patch }))}
          sections={['education']}
          className="w-full min-w-0"
        />
      )}

      <div className="flex justify-end gap-2 border-t pt-4">
        <Button type="button" variant="ghost" disabled={busy} onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={busy} loadingLabel={isEdit ? 'Saving…' : 'Adding…'} disabled={!parentNodeId}>
          {isEdit ? 'Save changes' : 'Add member'}
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
}: {
  label: string
  id: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={id} className="text-xs font-medium">
        {label}
      </Label>
      {children}
    </div>
  )
}
