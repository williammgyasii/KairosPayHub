import type { MemberOccupationStatus } from '@/api/structure'
import { MEMBER_OCCUPATION_OPTIONS } from '@/api/structure'
import { PhoneInput } from '@/components/ui/phone-input'
import { DatePicker } from '@/components/ui/date-picker'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  formatPhoneE164,
  isLocalPhoneComplete,
  parsePhoneE164,
  phoneCountryForCode,
} from '@/lib/phone-countries'
import { occupationFieldsPolicy } from '@/lib/occupation-fields-policy'
import { profileAddressPolicy, type ProfileAddressPolicy } from '@/lib/profile-address-policy'
import { cn } from '@/lib/utils'

export type MemberProfileFormValues = {
  phoneDialCode: string
  phoneLocal: string
  dateOfBirth: string
  residence: string
  state: string
  occupationStatus: MemberOccupationStatus | ''
  schoolOrWorkplace: string
  workplace: string
}

type FieldProps = {
  values: MemberProfileFormValues
  onChange: (patch: Partial<MemberProfileFormValues>) => void
  phoneId?: string
  className?: string
  requirePhoneAndDob?: boolean
  requireEmail?: boolean
  churchCountryCode?: string | null
  sections?: Array<'contact' | 'personal' | 'education'>
  layout?: 'stack' | 'grid'
  identity?: {
    name: string
    email: string
    onName: (name: string) => void
    onEmail: (email: string) => void
  }
}

export function isRequiredLeaderProfileComplete(
  email: string,
  profile: MemberProfileFormValues,
  countryCode?: string | null,
): boolean {
  const address = profileAddressPolicy(countryCode)
  return (
    email.trim().length > 0 &&
    isLocalPhoneComplete(profile.phoneDialCode, profile.phoneLocal) &&
    profile.dateOfBirth.trim().length > 0 &&
    (!address.requireState || profile.state.trim().length > 0)
  )
}

export function MemberProfileFields({
  values,
  onChange,
  phoneId = 'member-phone',
  className,
  requirePhoneAndDob = false,
  requireEmail = false,
  churchCountryCode,
  sections = ['contact', 'personal', 'education'],
  layout = 'stack',
  identity,
}: FieldProps) {
  const address = profileAddressPolicy(churchCountryCode)
  const occupation = occupationFieldsPolicy(values.occupationStatus)
  const showContact = sections.includes('contact')
  const showPersonal = sections.includes('personal')
  const showEducation = sections.includes('education')

  if (layout === 'grid') {
    return (
      <div className={cn('grid gap-4 sm:grid-cols-2', className)}>
        {identity && (
          <>
            <ProfileField label="Full name" id="join-name" required>
              <Input
                id="join-name"
                value={identity.name}
                onChange={(e) => identity.onName(e.target.value)}
                autoComplete="name"
                required
              />
            </ProfileField>
            <ProfileField label="Email" id="join-email" required={requireEmail}>
              <Input
                id="join-email"
                type="email"
                value={identity.email}
                onChange={(e) => identity.onEmail(e.target.value)}
                autoComplete="email"
                required={requireEmail}
              />
            </ProfileField>
          </>
        )}
        {showContact && (
          <ProfileField label="Phone number" id={phoneId} required={requirePhoneAndDob}>
            <PhoneInput
              id={phoneId}
              className="w-full"
              dialCode={values.phoneDialCode}
              localNumber={values.phoneLocal}
              onDialCodeChange={(phoneDialCode) => onChange({ phoneDialCode })}
              onLocalNumberChange={(phoneLocal) => onChange({ phoneLocal })}
              preferredCountryCode={churchCountryCode}
              required={requirePhoneAndDob}
            />
          </ProfileField>
        )}
        {showPersonal && (
          <ProfileField label="Date of birth" id="member-dob" required={requirePhoneAndDob}>
            <DatePicker
              id="member-dob"
              value={values.dateOfBirth}
              onChange={(dateOfBirth) => onChange({ dateOfBirth })}
              placeholder="Select date of birth"
              required={requirePhoneAndDob}
              disableFuture
            />
          </ProfileField>
        )}
        {showPersonal && address.showState && (
          <ProfileStateField
            address={address}
            value={values.state}
            required={requirePhoneAndDob && address.requireState}
            onChange={(state) => onChange({ state })}
          />
        )}
        {showPersonal && address.showState && (
          <ProfileField label={address.residenceLabel} id="member-residence">
            <Input
              id="member-residence"
              value={values.residence}
              onChange={(e) => onChange({ residence: e.target.value })}
              placeholder={address.residencePlaceholder}
            />
          </ProfileField>
        )}
        {showPersonal && !address.showState && (
          <ProfileField
            label={address.residenceLabel}
            id="member-residence"
            className="sm:col-span-2"
          >
            <Input
              id="member-residence"
              value={values.residence}
              onChange={(e) => onChange({ residence: e.target.value })}
              placeholder={address.residencePlaceholder}
            />
          </ProfileField>
        )}
        {showEducation && (
          <ProfileField
            label="Status"
            id="member-occupation"
            className={occupation.showSchool || occupation.showWorkplace ? undefined : 'sm:col-span-2'}
          >
            <select
              id="member-occupation"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={values.occupationStatus}
              onChange={(e) => {
                const occupationStatus = e.target.value as MemberOccupationStatus | ''
                const next = occupationFieldsPolicy(occupationStatus)
                onChange({
                  occupationStatus,
                  schoolOrWorkplace: next.showSchool ? values.schoolOrWorkplace : '',
                  workplace: next.showWorkplace ? values.workplace : '',
                })
              }}
            >
              <option value="">Select…</option>
              {MEMBER_OCCUPATION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </ProfileField>
        )}
        {showEducation && occupation.showSchool && (
          <ProfileField label={occupation.schoolLabel} id="member-school">
            <Input
              id="member-school"
              value={values.schoolOrWorkplace}
              onChange={(e) => onChange({ schoolOrWorkplace: e.target.value })}
              placeholder="School name"
            />
          </ProfileField>
        )}
        {showEducation && occupation.showWorkplace && (
          <ProfileField label={occupation.workplaceLabel} id="member-workplace">
            <Input
              id="member-workplace"
              value={values.workplace}
              onChange={(e) => onChange({ workplace: e.target.value })}
              placeholder="Company or role"
            />
          </ProfileField>
        )}
      </div>
    )
  }

  return (
    <div className={cn('space-y-5', className)}>
      {showContact && (
        <section className="space-y-3">
          <SectionHeading title="Contact" />
          <ProfileField label="Phone number" id={phoneId} required={requirePhoneAndDob} className="w-full">
            <PhoneInput
              id={phoneId}
              className="w-full"
              dialCode={values.phoneDialCode}
              localNumber={values.phoneLocal}
              onDialCodeChange={(phoneDialCode) => onChange({ phoneDialCode })}
              onLocalNumberChange={(phoneLocal) => onChange({ phoneLocal })}
              preferredCountryCode={churchCountryCode}
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
                disableFuture
              />
            </ProfileField>
            {address.showState && (
              <ProfileStateField
                address={address}
                value={values.state}
                required={requirePhoneAndDob && address.requireState}
                onChange={(state) => onChange({ state })}
              />
            )}
            <ProfileField label={address.residenceLabel} id="member-residence">
              <Input
                id="member-residence"
                value={values.residence}
                onChange={(e) => onChange({ residence: e.target.value })}
                placeholder={address.residencePlaceholder}
              />
            </ProfileField>
          </div>
        </section>
      )}

      {showEducation && (
        <section className="space-y-3">
          <SectionHeading title="Education & work" />
          <div className="grid gap-4 sm:grid-cols-2">
            <ProfileField
              label="Status"
              id="member-occupation"
              className={
                occupation.showSchool && occupation.showWorkplace ? 'sm:col-span-2' : undefined
              }
            >
              <select
                id="member-occupation"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={values.occupationStatus}
                onChange={(e) => {
                  const occupationStatus = e.target.value as MemberOccupationStatus | ''
                  const next = occupationFieldsPolicy(occupationStatus)
                  onChange({
                    occupationStatus,
                    schoolOrWorkplace: next.showSchool ? values.schoolOrWorkplace : '',
                    workplace: next.showWorkplace ? values.workplace : '',
                  })
                }}
              >
                <option value="">Select…</option>
                {MEMBER_OCCUPATION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </ProfileField>
            {occupation.showSchool && (
              <ProfileField label={occupation.schoolLabel} id="member-school">
                <Input
                  id="member-school"
                  value={values.schoolOrWorkplace}
                  onChange={(e) => onChange({ schoolOrWorkplace: e.target.value })}
                  placeholder="School name"
                />
              </ProfileField>
            )}
            {occupation.showWorkplace && (
              <ProfileField label={occupation.workplaceLabel} id="member-workplace">
                <Input
                  id="member-workplace"
                  value={values.workplace}
                  onChange={(e) => onChange({ workplace: e.target.value })}
                  placeholder="Company or role"
                />
              </ProfileField>
            )}
          </div>
        </section>
      )}
    </div>
  )
}

function ProfileStateField({
  address,
  value,
  required,
  onChange,
}: {
  address: ProfileAddressPolicy
  value: string
  required: boolean
  onChange: (state: string) => void
}) {
  return (
    <ProfileField label={address.stateLabel} id="member-state" required={required}>
      <select
        id="member-state"
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{address.stateSelectPlaceholder || 'Select…'}</option>
        {address.stateOptions.map((state) => (
          <option key={state.code} value={state.code}>
            {state.label}
          </option>
        ))}
      </select>
    </ProfileField>
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
  className,
}: {
  label: string
  id: string
  children: React.ReactNode
  required?: boolean
  className?: string
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

export function memberProfilePayload(values: MemberProfileFormValues) {
  const occupation = occupationFieldsPolicy(values.occupationStatus)
  return {
    phone: formatPhoneE164(values.phoneDialCode, values.phoneLocal),
    dateOfBirth: values.dateOfBirth || null,
    residence: values.residence.trim() || null,
    state: values.state.trim() || null,
    occupationStatus: occupation.persistedStatus,
    schoolOrWorkplace: occupation.showSchool ? values.schoolOrWorkplace.trim() || null : null,
    workplace: occupation.showWorkplace ? values.workplace.trim() || null : null,
  }
}

export function memberProfileInitialValues(source?: {
  phone?: string | null
  countryCode?: string | null
  dateOfBirth?: string | null
  residence?: string | null
  state?: string | null
  occupationStatus?: string | null
  schoolOrWorkplace?: string | null
  workplace?: string | null
}): MemberProfileFormValues {
  const parsed = source?.phone?.trim()
    ? parsePhoneE164(source.phone)
    : {
        dialCode: phoneCountryForCode(source?.countryCode).dialCode,
        localNumber: '',
      }
  const occupationStatus = (source?.occupationStatus as MemberOccupationStatus) ?? ''
  const occupation = occupationFieldsPolicy(occupationStatus)
  const storedSchool = source?.schoolOrWorkplace ?? ''
  const storedWorkplace = source?.workplace ?? ''
  return {
    phoneDialCode: parsed.dialCode,
    phoneLocal: parsed.localNumber,
    dateOfBirth: source?.dateOfBirth ?? '',
    residence: source?.residence ?? '',
    state: source?.state ?? '',
    occupationStatus,
    schoolOrWorkplace: occupation.showSchool ? storedSchool : '',
    workplace:
      storedWorkplace ||
      (occupation.showWorkplace && !occupation.showSchool ? storedSchool : ''),
  }
}
