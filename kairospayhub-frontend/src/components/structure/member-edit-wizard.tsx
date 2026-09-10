import { useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { CircleHelp } from 'lucide-react'
import { useApi } from '@/api/core'
import type { StructureTree } from '@/api/structure'
import { MEMBER_POSITION_OPTIONS, type MemberPosition } from '@/api/structure'
import type { DashboardOutletContext } from '@/components/layout/dashboard-layout'
import {
  MemberProfileFields,
  memberProfileInitialValues,
  memberProfilePayload,
  type MemberProfileFormValues,
} from '@/components/structure/member-profile-fields'
import { WizardField, WizardFooter } from '@/components/structure/wizard-shell'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { memberRolePolicy } from '@/lib/member-role-policy'
import { MEMBER_RESPONSIVENESS_OPTIONS } from '@/lib/member-responsiveness'
import type { StructureMemberRow } from '@/lib/structure-table-rows'
import { formatCellName, formatFellowshipName, nodeById } from '@/lib/structure-tree'

export function MemberEditWizard({
  tree,
  unitNodeId,
  member,
  busy,
  submit,
  onClose,
  presentation = 'modal',
}: {
  tree: StructureTree
  unitNodeId?: string
  member: StructureMemberRow
  busy: boolean
  submit: (action: () => Promise<void>) => Promise<void>
  onClose: () => void
  presentation?: 'modal' | 'page'
}) {
  const api = useApi()
  const { me } = useOutletContext<DashboardOutletContext>()
  const unit = unitNodeId ? nodeById(tree, unitNodeId) : undefined
  const cellLabel = unit ? formatCellName(unit.name) : null
  const fellowshipLabel = unit ? formatFellowshipName(unit.name) : null

  const [stepError, setStepError] = useState<string | null>(null)
  const [name, setName] = useState(member.member)
  const [email] = useState(member.email ?? '')
  const [profile, setProfile] = useState<MemberProfileFormValues>(() =>
    memberProfileInitialValues({
      ...member,
      countryCode: me.countryCode,
    }),
  )
  const [position, setPosition] = useState<MemberPosition>(member.position ?? 'Member')
  const [responsiveness, setResponsiveness] = useState(member.responsiveness ?? 3)

  const rolePolicy = useMemo(
    () =>
      memberRolePolicy({
        actorMemberId: me.memberId,
        actorRole: me.role,
        subjectMemberId: member.id,
        subjectPosition: member.position ?? 'Member',
      }),
    [me, member.id, member.position],
  )

  useEffect(() => {
    setName(member.member)
    setProfile(memberProfileInitialValues({ ...member, countryCode: me.countryCode }))
    setPosition(member.position ?? 'Member')
    setResponsiveness(member.responsiveness ?? 3)
    setStepError(null)
  }, [member, me.countryCode])

  function save() {
    if (!name.trim()) {
      setStepError('Enter the member’s full name.')
      return
    }
    setStepError(null)
    void submit(async () => {
      const profilePayload = memberProfilePayload(profile)
      await api.patch(`/api/structure/members/${member.id}`, {
        name: name.trim(),
        ...profilePayload,
        position: rolePolicy.canEditPosition ? position : member.position,
        parentNodeId: member.parentNodeId,
        responsiveness,
      })
      onClose()
    })
  }

  const body = (
    <div className="space-y-5">
      {stepError && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {stepError}
        </p>
      )}

      <div className="space-y-4">
        {(cellLabel || member.path) && (
          <p className="text-sm text-muted-foreground">
            Member of{' '}
            <span className="font-medium text-foreground">
              {cellLabel ?? fellowshipLabel ?? member.path}
            </span>
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <WizardField label="Full name" id="member-name" required>
            <Input
              id="member-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setStepError(null)
              }}
              required
              autoFocus
            />
          </WizardField>

          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <label htmlFor="member-email" className="text-xs font-medium">
                Email
              </label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex text-muted-foreground transition-colors hover:text-foreground"
                    aria-label="About member email"
                  >
                    <CircleHelp className="size-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[240px] text-left leading-relaxed">
                  {email
                    ? 'Email is used for newsletters and church updates. Login emails are managed separately for leaders.'
                    : 'No email on file. Add one when creating a new member.'}
                </TooltipContent>
              </Tooltip>
            </div>
            <Input
              id="member-email"
              type="email"
              value={email}
              readOnly
              className="bg-muted/40 text-muted-foreground"
            />
          </div>
        </div>

        <MemberProfileFields
          phoneId="member-phone"
          churchCountryCode={me.countryCode}
          values={profile}
          onChange={(patch) => setProfile((current) => ({ ...current, ...patch }))}
          sections={['contact', 'personal', 'education']}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <WizardField label="Role" id="member-role">
            <select
              id="member-role"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm disabled:cursor-not-allowed disabled:bg-muted/40 disabled:text-muted-foreground"
              value={position}
              disabled={!rolePolicy.canEditPosition}
              onChange={(e) => setPosition(e.target.value as MemberPosition)}
            >
              {(rolePolicy.canEditPosition
                ? MEMBER_POSITION_OPTIONS.filter((option) =>
                    rolePolicy.assignablePositions.includes(option.value),
                  )
                : MEMBER_POSITION_OPTIONS.filter((option) => option.value === position)
              ).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {!rolePolicy.canEditPosition && (
              <p className="text-xs text-muted-foreground">Role follows the church structure.</p>
            )}
          </WizardField>

          <WizardField label="Responsiveness" id="member-responsiveness">
            <select
              id="member-responsiveness"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={responsiveness}
              onChange={(e) => setResponsiveness(Number(e.target.value))}
            >
              {MEMBER_RESPONSIVENESS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.value} — {option.label}
                </option>
              ))}
            </select>
          </WizardField>
        </div>
      </div>

      <WizardFooter
        step={0}
        busy={busy}
        onCancel={onClose}
        onBack={onClose}
        onNext={save}
        isLastStep
        canProceed={name.trim().length > 0}
        submitLabel="Save changes"
        busyLabel="Saving…"
      />
    </div>
  )

  if (presentation === 'page') {
    return (
      <section className="rounded-xl border border-border/60 bg-background p-5 sm:p-6">
        <div className="mb-5 space-y-1">
          <h2 className="text-section-title">Edit member</h2>
          <p className="text-sm text-muted-foreground">
            {cellLabel
              ? `Update ${name.trim() || 'this member'} in ${cellLabel}.`
              : fellowshipLabel
                ? `Update ${name.trim() || 'this member'} in ${fellowshipLabel}.`
                : 'Update profile details for this person.'}
          </p>
        </div>
        {body}
      </section>
    )
  }

  return (
    <Modal
      open
      onOpenChange={(open) => !open && onClose()}
      title="Edit member"
      description={
        cellLabel
          ? `Update ${name.trim() || 'this member'} in ${cellLabel}.`
          : fellowshipLabel
            ? `Update ${name.trim() || 'this member'} in ${fellowshipLabel}.`
            : 'Update profile details for this person.'
      }
      size="xl"
    >
      {body}
    </Modal>
  )
}
