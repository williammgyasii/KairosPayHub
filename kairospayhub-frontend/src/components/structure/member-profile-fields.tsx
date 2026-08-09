import type { MemberOccupationStatus } from '@/api/structure'
import { MEMBER_OCCUPATION_OPTIONS } from '@/api/structure'
import { PhoneInput } from '@/components/ui/phone-input'
import { DatePicker } from '@/components/ui/date-picker'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatPhoneE164, isLocalPhoneComplete, parsePhoneE164 } from '@/lib/phone-countries'
import { cn } from '@/lib/utils'

export type MemberProfileFormValues = {
  phoneDialCode: string
  phoneLocal: string
  dateOfBirth: string
  residence: string
  occupationStatus: MemberOccupationStatus | ''
  schoolOrWorkplace: string
}

type FieldProps = {
  values: MemberProfileFormValues
  onChange: (patch: Partial<MemberProfileFormValues>) => void
  phoneId?: string
  className?: string
  requirePhoneAndDob?: boolean
  sections?: Array<'contact' | 'personal' | 'education'>
}

export function isRequiredLeaderProfileComplete(
  email: string,
  profile: MemberProfileFormValues,
): boolean {
  return (
    email.trim().length > 0 &&
    isLocalPhoneComplete(profile.phoneDialCode, profile.phoneLocal) &&
    profile.dateOfBirth.trim().length > 0
  )
}

export function MemberProfileFields({
  values,
  onChange,
  phoneId = 'member-phone',
  className,
  requirePhoneAndDob = false,
  sections = ['contact', 'personal', 'education'],
}: FieldProps) {
  const showContact = sections.includes('contact')
  const showPersonal = sections.includes('personal')
  const showEducation = sections.includes('education')
  const showSchool =
    showEducation &&
    (values.occupationStatus === 'Student' ||
      values.occupationStatus === 'Working' ||
      values.occupationStatus === 'StudentAndWorking')

  const schoolLabel =
    values.occupationStatus === 'Working'
      ? 'Workplace'
      : values.occupationStatus === 'Student'
        ? 'School / institution'
        : values.occupationStatus === 'StudentAndWorking'
          ? 'School or workplace'
          : 'School or workplace'

  return (
    <div className={cn('space-y-5', className)}>
      {showContact && (
        <section className="space-y-3">
          <SectionHeading title="Contact" />
          <ProfileField label="Phone number" id={phoneId} required={requirePhoneAndDob}>
            <PhoneInput
              id={phoneId}
              dialCode={values.phoneDialCode}
              localNumber={values.phoneLocal}
              onDialCodeChange={(phoneDialCode) => onChange({ phoneDialCode })}
              onLocalNumberChange={(phoneLocal) => onChange({ phoneLocal })}
              required={requirePhoneAndDob}
            />
          </ProfileField>
        </section>
      )}

      {showPersonal && (
        <section className="space-y-3">
          <SectionHeading title="Personal" />
          <div className="grid gap-4 sm:grid-cols-2">
            <ProfileField label="Date of birth" id="member-dob" required={requirePhoneAndDob}>
              <DatePicker
                id="member-dob"
                value={values.dateOfBirth}
                onChange={(dateOfBirth) => onChange({ dateOfBirth })}
                placeholder="Select date of birth"
                required={requirePhoneAndDob}
              />
            </ProfileField>
            <ProfileField label="Residence / location" id="member-residence">
              <Input
                id="member-residence"
                value={values.residence}
                onChange={(e) => onChange({ residence: e.target.value })}
                placeholder="City, area, or address"
              />
            </ProfileField>
          </div>
        </section>
      )}

      {showEducation && (
        <section className="space-y-3">
          <SectionHeading title="Education & work" />
          <div className="grid gap-4 sm:grid-cols-2">
            <ProfileField label="Status" id="member-occupation">
              <select
                id="member-occupation"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={values.occupationStatus}
                onChange={(e) =>
                  onChange({ occupationStatus: e.target.value as MemberOccupationStatus | '' })
                }
              >
                <option value="">Select…</option>
                {MEMBER_OCCUPATION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </ProfileField>
            {showSchool && (
              <ProfileField label={schoolLabel} id="member-school">
                <Input
                  id="member-school"
                  value={values.schoolOrWorkplace}
                  onChange={(e) => onChange({ schoolOrWorkplace: e.target.value })}
                  placeholder={
                    values.occupationStatus === 'Working' ? 'Company or role' : 'School name'
                  }
                />
              </ProfileField>
            )}
          </div>
        </section>
      )}
    </div>
  )
}

function SectionHeading({ title }: { title: string }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
  )
}

function ProfileField({
  label,
  id,
  children,
  required = false,
}: {
  label: string
  id: string
  children: React.ReactNode
  required?: boolean
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs font-medium">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      {children}
    </div>
  )
}

export function memberProfilePayload(values: MemberProfileFormValues) {
  return {
    phone: formatPhoneE164(values.phoneDialCode, values.phoneLocal),
    dateOfBirth: values.dateOfBirth || null,
    residence: values.residence.trim() || null,
    occupationStatus: values.occupationStatus || null,
    schoolOrWorkplace: values.schoolOrWorkplace.trim() || null,
  }
}

export function memberProfileInitialValues(source?: {
  phone?: string | null
  dateOfBirth?: string | null
  residence?: string | null
  occupationStatus?: string | null
  schoolOrWorkplace?: string | null
}): MemberProfileFormValues {
  const parsed = parsePhoneE164(source?.phone)
  return {
    phoneDialCode: parsed.dialCode,
    phoneLocal: parsed.localNumber,
    dateOfBirth: source?.dateOfBirth ?? '',
    residence: source?.residence ?? '',
    occupationStatus: (source?.occupationStatus as MemberOccupationStatus) ?? '',
    schoolOrWorkplace: source?.schoolOrWorkplace ?? '',
  }
}
