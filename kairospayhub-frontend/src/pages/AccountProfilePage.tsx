import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useOutletContext } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import {
  Briefcase,
  Church,
  GraduationCap,
  MapPin,
  Pencil,
  Phone,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { canEditSelfProfile, canManageChurch, type Me } from '@/api/auth'
import { MEMBER_OCCUPATION_OPTIONS, type MemberOccupationStatus } from '@/api/structure'
import type { DashboardOutletContext } from '@/components/layout/dashboard-layout'
import { roleDisplayInfo } from '@/components/layout/role-badge'
import { ChurchLogoSettingsSection } from '@/components/settings/church-logo-settings-section'
import { ProfileAvatarSettingsSection } from '@/components/settings/profile-avatar-settings-section'
import {
  memberProfileInitialValues,
  memberProfilePayload,
} from '@/components/structure/member-profile-fields'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PhoneInput } from '@/components/ui/phone-input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatPhoneE164 } from '@/lib/phone-countries'
import { formatApiError } from '@/lib/structure-tree'
import { usePatchMeMutation } from '@/store/meApi'
import { cn } from '@/lib/utils'

type ProfileFormValues = {
  name: string
  phoneDialCode: string
  phoneLocal: string
  dateOfBirth: string
  residence: string
  state: string
  occupationStatus: MemberOccupationStatus | ''
  schoolOrWorkplace: string
  workplace: string
}

export function AccountProfilePage() {
  const { me, reloadMe } = useOutletContext<DashboardOutletContext>()
  const canEdit = canEditSelfProfile(me)
  const [editing, setEditing] = useState(false)
  const initial = memberProfileInitialValues(me)
  const form = useForm<ProfileFormValues>({
    defaultValues: {
      name: me.name ?? '',
      ...initial,
    },
  })
  const [patchMe, { isLoading }] = usePatchMeMutation()
  const values = form.watch()
  const occupation = values.occupationStatus
  const showSchool =
    occupation === 'Student' || occupation === 'Working' || occupation === 'StudentAndWorking'
  const schoolLabel =
    occupation === 'Working'
      ? 'Workplace'
      : occupation === 'Student'
        ? 'School / institution'
        : 'School or workplace'

  function startEdit() {
    form.reset({
      name: me.name ?? '',
      ...memberProfileInitialValues(me),
    })
    setEditing(true)
  }

  function cancelEdit() {
    form.reset()
    setEditing(false)
  }

  async function onSubmit(next: ProfileFormValues) {
    try {
      await patchMe({
        name: next.name.trim(),
        ...memberProfilePayload(next),
      }).unwrap()
      await reloadMe()
      toast.success('Profile saved')
      setEditing(false)
    } catch (err) {
      const message = formatApiError(err)
      form.setError('root', { message })
      toast.error(message)
    }
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <ProfileAvatarSettingsSection me={me} />
      {canManageChurch(me.role) ? <ChurchLogoSettingsSection /> : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <IdentityChips me={me} />
        {canEdit && !editing ? (
          <Button type="button" className="w-full shrink-0 sm:w-auto" onClick={startEdit}>
            <Pencil className="size-4" aria-hidden />
            Edit profile
          </Button>
        ) : null}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 sm:space-y-8">
          <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
            {editing ? (
              <FormField
                control={form.control}
                name="name"
                rules={{ required: 'Name is required' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <ReadOnlyField label="Name" value={values.name} />
            )}
            <div className="grid gap-1.5">
              <Label htmlFor="account-email" className="text-xs font-medium">
                Email
              </Label>
              <Input id="account-email" value={me.email ?? ''} disabled readOnly />
              <p className="text-[11px] text-muted-foreground">Managed by your sign-in account.</p>
            </div>
          </div>

          {canEdit ? (
            <>
              <section className="space-y-3">
                <SectionLabel icon={Phone} tone="sky" title="Contact" />
                {editing ? (
                  <FormField
                    control={form.control}
                    name="phoneLocal"
                    render={({ field }) => (
                      <FormItem className="w-full max-w-full sm:max-w-[18rem]">
                        <Label htmlFor="account-phone" className="text-xs font-medium">
                          Phone number
                        </Label>
                        <PhoneInput
                          id="account-phone"
                          className="w-full max-w-full sm:max-w-[18rem]"
                          dialCode={values.phoneDialCode}
                          localNumber={field.value}
                          onDialCodeChange={(phoneDialCode) =>
                            form.setValue('phoneDialCode', phoneDialCode)
                          }
                          onLocalNumberChange={field.onChange}
                        />
                      </FormItem>
                    )}
                  />
                ) : (
                  <ReadOnlyField
                    label="Phone number"
                    value={formatPhoneE164(values.phoneDialCode, values.phoneLocal)}
                  />
                )}
              </section>

              <section className="space-y-3">
                <SectionLabel icon={MapPin} tone="teal" title="Personal" />
                <div className="grid gap-4 sm:grid-cols-2">
                  {editing ? (
                    <FormField
                      control={form.control}
                      name="dateOfBirth"
                      render={({ field }) => (
                        <FormItem>
                          <Label htmlFor="account-dob" className="text-xs font-medium">
                            Date of birth
                          </Label>
                          <DatePicker
                            id="account-dob"
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Select date of birth"
                            disableFuture
                          />
                        </FormItem>
                      )}
                    />
                  ) : (
                    <ReadOnlyField label="Date of birth" value={formatDob(values.dateOfBirth)} />
                  )}
                  {editing ? (
                    <FormField
                      control={form.control}
                      name="residence"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Residence / location</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="City, area, or address" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  ) : (
                    <ReadOnlyField label="Residence / location" value={values.residence} />
                  )}
                </div>
              </section>

              <section className="space-y-3">
                <SectionLabel
                  icon={occupation === 'Student' ? GraduationCap : Briefcase}
                  tone="violet"
                  title="Work & school"
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  {editing ? (
                    <FormField
                      control={form.control}
                      name="occupationStatus"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select
                            value={field.value || undefined}
                            onValueChange={field.onChange}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select…" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {MEMBER_OCCUPATION_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  ) : (
                    <ReadOnlyField label="Status" value={occupationLabel(occupation)} />
                  )}
                  {showSchool ? (
                    editing ? (
                      <FormField
                        control={form.control}
                        name="schoolOrWorkplace"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{schoolLabel}</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder={
                                  occupation === 'Working' ? 'Company or role' : 'School name'
                                }
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    ) : (
                      <ReadOnlyField label={schoolLabel} value={values.schoolOrWorkplace} />
                    )
                  ) : null}
                </div>
              </section>

              {form.formState.errors.root?.message ? (
                <p className="text-sm text-destructive">{form.formState.errors.root.message}</p>
              ) : null}

              {editing ? (
                <div className="sticky bottom-0 z-20 -mx-4 border-t border-border/60 bg-background/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-none">
                  <div className="flex flex-col-reverse gap-2 sm:flex-row">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full sm:w-auto"
                      onClick={cancelEdit}
                    >
                      <X className="size-4" aria-hidden />
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="w-full sm:w-auto"
                      disabled={isLoading || !values.name.trim()}
                    >
                      {isLoading ? 'Saving…' : 'Save profile'}
                    </Button>
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Profile details are available once you are on the church roster.
            </p>
          )}
        </form>
      </Form>
    </div>
  )
}

function IdentityChips({ me }: { me: Me }) {
  const roleInfo = me.onboarded ? roleDisplayInfo(me) : null
  const RoleIcon = roleInfo?.icon

  return (
    <div className="flex min-w-0 flex-wrap gap-2 sm:gap-3">
      {roleInfo && RoleIcon ? (
        <div className="inline-flex min-w-0 max-w-full items-center gap-2.5 rounded-2xl bg-violet-500/12 px-3 py-2 text-violet-950 ring-1 ring-violet-500/20 dark:text-violet-100">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-violet-600 text-white">
            <RoleIcon className="size-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-700 dark:text-violet-300">
              Role
            </p>
            <p className="truncate text-sm font-semibold leading-tight">{roleInfo.title}</p>
          </div>
        </div>
      ) : null}
      {me.churchName ? (
        <div className="inline-flex min-w-0 max-w-full items-center gap-2.5 rounded-2xl bg-amber-500/12 px-3 py-2 text-amber-950 ring-1 ring-amber-500/25 dark:text-amber-100">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-white">
            <Church className="size-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-300">
              Church
            </p>
            <p className="truncate text-sm font-semibold leading-tight">{me.churchName}</p>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function SectionLabel({
  icon: Icon,
  title,
  tone,
}: {
  icon: typeof Phone
  title: string
  tone: 'sky' | 'teal' | 'violet'
}) {
  return (
    <p
      className={cn(
        'inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide',
        tone === 'sky' && 'text-sky-700 dark:text-sky-300',
        tone === 'teal' && 'text-teal-700 dark:text-teal-300',
        tone === 'violet' && 'text-violet-700 dark:text-violet-300',
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {title}
    </p>
  )
}

function ReadOnlyField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="min-w-0 space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="break-words text-sm font-medium">{value?.trim() ? value : '—'}</p>
    </div>
  )
}

function formatDob(value: string) {
  if (!value) return ''
  try {
    return format(parseISO(value), 'PPP')
  } catch {
    return value
  }
}

function occupationLabel(value: MemberOccupationStatus | '') {
  return MEMBER_OCCUPATION_OPTIONS.find((option) => option.value === value)?.label ?? value
}
