import { useEffect, useState } from 'react'
import type { ApiClient } from '@/api/client'
import type { MemberOccupationStatus } from '@/api/structure'
import { MEMBER_OCCUPATION_OPTIONS } from '@/api/structure'
import { createCellInvitee } from '@/api/attendance'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PhoneInput } from '@/components/ui/phone-input'
import {
  formatPhoneE164,
  isLocalPhoneComplete,
  parsePhoneE164,
} from '@/lib/phone-countries'
import { cn } from '@/lib/utils'

export type InviteePriorChurchAttendance = 'Never' | 'Once' | 'MoreThanOnce'

export const INVITEE_PRIOR_CHURCH_OPTIONS: {
  value: InviteePriorChurchAttendance
  label: string
}[] = [
  { value: 'Never', label: 'Never been to church before' },
  { value: 'Once', label: 'Been to church once before' },
  { value: 'MoreThanOnce', label: 'Been to church more than once' },
]

export type CreatedInvitee = {
  id: string
  name: string
  phone: string
  residence: string
  isFirstTimer: boolean
  priorChurchAttendance: string
  invitedByMemberId: string
  invitedByMemberName: string
}

interface AddInviteeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  api: ApiClient
  scopeNodeId: string
  cellMembers: Array<{ id: string; name: string }>
  disabled?: boolean
  onCreated: (invitee: CreatedInvitee) => void
}

const selectClassName =
  'flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm'

function SectionHeading({ title }: { title: string }) {
  return (
    <p className="col-span-full text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {title}
    </p>
  )
}

function FormField({
  label,
  htmlFor,
  required,
  className,
  children,
}: {
  label: string
  htmlFor: string
  required?: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={htmlFor} className="text-xs font-medium">
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      {children}
    </div>
  )
}

export function AddInviteeModal({
  open,
  onOpenChange,
  api,
  scopeNodeId,
  cellMembers,
  disabled,
  onCreated,
}: AddInviteeModalProps) {
  const [name, setName] = useState('')
  const [invitedByMemberId, setInvitedByMemberId] = useState('')
  const [phoneDialCode, setPhoneDialCode] = useState('+233')
  const [phoneLocal, setPhoneLocal] = useState('')
  const [residence, setResidence] = useState('')
  const [occupationStatus, setOccupationStatus] = useState<MemberOccupationStatus | ''>('')
  const [schoolOrWorkplace, setSchoolOrWorkplace] = useState('')
  const [isFirstTimer, setIsFirstTimer] = useState(true)
  const [priorChurchAttendance, setPriorChurchAttendance] = useState<InviteePriorChurchAttendance | ''>(
    '',
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const showSchool =
    occupationStatus === 'Student'
    || occupationStatus === 'Working'
    || occupationStatus === 'StudentAndWorking'

  const schoolLabel =
    occupationStatus === 'Working'
      ? 'Workplace'
      : occupationStatus === 'Student'
        ? 'School / institution'
        : 'School or workplace'

  useEffect(() => {
    if (!open) return
    setName('')
    setPhoneDialCode('+233')
    setPhoneLocal('')
    setResidence('')
    setOccupationStatus('')
    setSchoolOrWorkplace('')
    setIsFirstTimer(true)
    setPriorChurchAttendance('')
    setInvitedByMemberId(cellMembers[0]?.id ?? '')
    setError(null)
  }, [open, cellMembers])

  useEffect(() => {
    if (priorChurchAttendance === 'Never') {
      setIsFirstTimer(true)
    } else if (priorChurchAttendance === 'MoreThanOnce') {
      setIsFirstTimer(false)
    }
  }, [priorChurchAttendance])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError('Name is required.')
      return
    }
    if (!isLocalPhoneComplete(phoneDialCode, phoneLocal)) {
      setError('Enter a valid phone number.')
      return
    }
    if (!priorChurchAttendance) {
      setError('Select their previous church attendance.')
      return
    }
    if (!invitedByMemberId) {
      setError('Select which member invited them.')
      return
    }

    const phone = formatPhoneE164(phoneDialCode, phoneLocal)
    if (!phone) {
      setError('Enter a valid phone number.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      const created = await createCellInvitee(api, scopeNodeId, {
        name: name.trim(),
        phone,
        residence: residence.trim() || null,
        occupationStatus: occupationStatus || null,
        schoolOrWorkplace: schoolOrWorkplace.trim() || null,
        isFirstTimer,
        priorChurchAttendance,
        invitedByMemberId,
      })
      const invitedByMemberName =
        cellMembers.find((member) => member.id === invitedByMemberId)?.name ?? 'Member'
      onCreated({
        id: created.id,
        name: created.name,
        phone: created.phone ?? phone,
        residence: created.residence ?? residence.trim(),
        isFirstTimer: created.isFirstTimer,
        priorChurchAttendance: created.priorChurchAttendance ?? priorChurchAttendance,
        invitedByMemberId: created.invitedByMemberId ?? invitedByMemberId,
        invitedByMemberName: created.invitedByMemberName ?? invitedByMemberName,
      })
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add invitee')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Add invitee"
      description="Capture who you invited and a little context for follow-up."
      size="xl"
    >
      <form className="space-y-6" onSubmit={(e) => void onSubmit(e)}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SectionHeading title="Contact" />

          <FormField label="Invited by" htmlFor="add-invitee-invited-by" required className="sm:col-span-2">
            <select
              id="add-invitee-invited-by"
              className={selectClassName}
              value={invitedByMemberId}
              disabled={disabled || saving || cellMembers.length === 0}
              onChange={(e) => setInvitedByMemberId(e.target.value)}
            >
              {cellMembers.length === 0 ? (
                <option value="">No cell members available</option>
              ) : (
                cellMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))
              )}
            </select>
          </FormField>

          <FormField label="Name" htmlFor="add-invitee-name" required>
            <Input
              id="add-invitee-name"
              value={name}
              disabled={disabled || saving}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              autoFocus
            />
          </FormField>

          <FormField label="Phone number" htmlFor="add-invitee-phone" required>
            <PhoneInput
              id="add-invitee-phone"
              dialCode={phoneDialCode}
              localNumber={phoneLocal}
              onDialCodeChange={setPhoneDialCode}
              onLocalNumberChange={setPhoneLocal}
              required
            />
          </FormField>

          <SectionHeading title="Location & work" />

          <FormField label="Location / area" htmlFor="add-invitee-residence">
            <Input
              id="add-invitee-residence"
              value={residence}
              disabled={disabled || saving}
              onChange={(e) => setResidence(e.target.value)}
              placeholder="City, area, or address"
            />
          </FormField>

          <FormField label="Working or in school?" htmlFor="add-invitee-occupation">
            <select
              id="add-invitee-occupation"
              className={selectClassName}
              value={occupationStatus}
              disabled={disabled || saving}
              onChange={(e) =>
                setOccupationStatus(e.target.value as MemberOccupationStatus | '')
              }
            >
              <option value="">Select…</option>
              {MEMBER_OCCUPATION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </FormField>

          {showSchool && (
            <FormField
              label={schoolLabel}
              htmlFor="add-invitee-school"
              className="sm:col-span-2"
            >
              <Input
                id="add-invitee-school"
                value={schoolOrWorkplace}
                disabled={disabled || saving}
                onChange={(e) => setSchoolOrWorkplace(e.target.value)}
                placeholder={
                  occupationStatus === 'Working' ? 'Company or role' : 'School name'
                }
              />
            </FormField>
          )}

          <SectionHeading title="Church background" />

          <fieldset className="space-y-2 sm:col-span-1">
            <legend className="mb-2 text-xs font-medium">
              Previous church attendance <span className="text-destructive">*</span>
            </legend>
            {INVITEE_PRIOR_CHURCH_OPTIONS.map((option) => (
              <label
                key={option.value}
                className="flex items-start gap-2 rounded-md py-1 text-sm leading-snug"
              >
                <input
                  type="radio"
                  name="prior-church-attendance"
                  className="mt-0.5"
                  disabled={disabled || saving}
                  checked={priorChurchAttendance === option.value}
                  onChange={() => setPriorChurchAttendance(option.value)}
                />
                {option.label}
              </label>
            ))}
          </fieldset>

          <div className="flex flex-col justify-center gap-2 sm:col-span-1">
            <label className="flex items-start gap-2 rounded-md py-1 text-sm">
              <input
                type="checkbox"
                className="mt-0.5"
                disabled={disabled || saving}
                checked={isFirstTimer}
                onChange={(e) => setIsFirstTimer(e.target.checked)}
              />
              <span>
                First time visiting our church
                <span className="mt-1 block text-xs font-normal text-muted-foreground">
                  First timers appear on the First timers tab after you save roll call.
                </span>
              </span>
            </label>
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex justify-end gap-2 border-t pt-4">
          <Button type="button" variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={disabled || saving}>
            {saving ? 'Adding…' : 'Add invitee'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export function inviteePhoneInitialValues(phone?: string | null) {
  return parsePhoneE164(phone)
}
