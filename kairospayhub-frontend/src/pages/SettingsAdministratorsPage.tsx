import { useCallback, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useOutletContext } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import type { DashboardOutletContext } from '@/components/layout/dashboard-layout'
import { useApi } from '@/api/core'
import {
  createAdministrator,
  deactivateAdministrator,
  listAdministrators,
  suggestAdminEmail,
  type ChurchAdministrator,
  type ChurchAdminAffiliationKind,
} from '@/api/administrators'
import {
  CHURCH_ADMIN_AFFILIATION,
  churchAdminAffiliationLabel,
  churchAdminStatusLabel,
} from '@/lib/church-administrators'
import { SettingsSection } from '@/components/settings/settings-section'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import {
  EmailAvailabilityField,
  isEmailAvailabilityBlocking,
  useEmailAvailability,
} from '@/components/structure/email-availability-field'
import { cn } from '@/lib/utils'

type AdminFormValues = {
  firstName: string
  lastName: string
  email: string
  affiliationKind: ChurchAdminAffiliationKind
  password: string
  sendInvite: boolean
}

const defaultValues: AdminFormValues = {
  firstName: '',
  lastName: '',
  email: '',
  affiliationKind: CHURCH_ADMIN_AFFILIATION.External,
  password: '',
  sendInvite: false,
}

export function SettingsAdministratorsPage() {
  const { me } = useOutletContext<DashboardOutletContext>()
  const api = useApi()
  const [admins, setAdmins] = useState<ChurchAdministrator[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [listOpen, setListOpen] = useState(true)

  const form = useForm<AdminFormValues>({ defaultValues })
  const sendInvite = form.watch('sendInvite')
  const email = form.watch('email')
  const affiliationKind = form.watch('affiliationKind')
  const emailAvailability = useEmailAvailability(email, 'login')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setAdmins(await listAdministrators(api))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load administrators')
    } finally {
      setLoading(false)
    }
  }, [api])

  useEffect(() => {
    void load()
  }, [load])

  async function onSuggestEmail() {
    if (!me.email) return
    try {
      const result = await suggestAdminEmail(api, me.email)
      form.setValue('email', result.email, { shouldDirty: true, shouldValidate: true })
    } catch (err) {
      form.setError('root', {
        message: err instanceof Error ? err.message : 'Could not suggest email',
      })
    }
  }

  async function onCreate(values: AdminFormValues) {
    form.clearErrors('root')
    try {
      await createAdministrator(api, {
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        email: values.email.trim(),
        affiliationKind: values.affiliationKind,
        password: values.sendInvite ? undefined : values.password,
        sendInviteEmail: values.sendInvite,
      })
      form.reset(defaultValues)
      await load()
    } catch (err) {
      form.setError('root', {
        message: err instanceof Error ? err.message : 'Could not create administrator',
      })
    }
  }

  async function onDeactivate(id: string) {
    try {
      await deactivateAdministrator(api, id)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not disable administrator')
    }
  }

  return (
    <div className="space-y-8">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <SettingsSection
        title="Add administrator"
        description="Backup accounts with full church access when the pastor is unavailable."
      >
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((values) => void onCreate(values))}
            className="space-y-5"
          >
            <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
              <FormField
                control={form.control}
                name="firstName"
                rules={{ required: 'First name is required' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First name</FormLabel>
                    <FormControl>
                      <Input {...field} autoComplete="given-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                rules={{ required: 'Last name is required' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last name</FormLabel>
                    <FormControl>
                      <Input {...field} autoComplete="family-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <FormField
                control={form.control}
                name="email"
                rules={{ required: 'Email is required' }}
                render={({ field }) => (
                  <FormItem className="min-w-0 flex-1">
                    <EmailAvailabilityField
                      id="admin-email"
                      email={field.value}
                      onChange={field.onChange}
                      scope="login"
                      required
                      label="Email (must be unique)"
                      className="min-w-0"
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="button"
                variant="outline"
                className="shrink-0"
                onClick={() => void onSuggestEmail()}
              >
                Suggest
              </Button>
            </div>

            <FormField
              control={form.control}
              name="affiliationKind"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Affiliation</FormLabel>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={
                        field.value === CHURCH_ADMIN_AFFILIATION.External ? 'default' : 'outline'
                      }
                      onClick={() => field.onChange(CHURCH_ADMIN_AFFILIATION.External)}
                    >
                      External
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={
                        field.value === CHURCH_ADMIN_AFFILIATION.InChurch ? 'default' : 'outline'
                      }
                      onClick={() => field.onChange(CHURCH_ADMIN_AFFILIATION.InChurch)}
                      disabled
                      title="Member linking coming soon"
                    >
                      In church
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {affiliationKind === CHURCH_ADMIN_AFFILIATION.External
                      ? 'Outside the member roster — still gets full church admin access.'
                      : 'Linked to a church member (coming soon).'}
                  </p>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sendInvite"
              render={({ field }) => (
                <FormItem>
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <input
                      type="checkbox"
                      className="size-3.5 accent-primary"
                      checked={field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                    />
                    Send set-password email instead of setting password now
                  </label>
                </FormItem>
              )}
            />

            {!sendInvite ? (
              <FormField
                control={form.control}
                name="password"
                rules={{
                  validate: (value, values) =>
                    values.sendInvite || value.trim().length > 0 || 'Password is required',
                }}
                render={({ field }) => (
                  <FormItem className="max-w-md">
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input {...field} type="password" autoComplete="new-password" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}

            {form.formState.errors.root?.message ? (
              <p className="text-sm text-destructive">{form.formState.errors.root.message}</p>
            ) : null}

            <Button
              type="submit"
              disabled={
                form.formState.isSubmitting ||
                isEmailAvailabilityBlocking(email, emailAvailability)
              }
            >
              {form.formState.isSubmitting ? 'Creating…' : 'Create administrator'}
            </Button>
          </form>
        </Form>
      </SettingsSection>

      <section className="space-y-3">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/10 px-4 py-3 text-left"
          aria-expanded={listOpen}
          onClick={() => setListOpen((open) => !open)}
        >
          <div className="min-w-0">
            <p className="text-sm font-semibold tracking-tight">Administrators</p>
            <p className="text-xs text-muted-foreground">
              People with church admin access
              {loading ? '' : ` · ${admins.length}`}
            </p>
          </div>
          <ChevronDown
            className={cn(
              'size-4 shrink-0 text-muted-foreground transition-transform',
              listOpen && 'rotate-180',
            )}
            aria-hidden
          />
        </button>

        {listOpen ? (
          loading ? (
            <Spinner label="Loading administrators…" />
          ) : (
            <div className="overflow-hidden rounded-xl border border-border/60">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-sm">
                  <thead className="border-b border-border/60 bg-muted/20 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">Name</th>
                      <th className="px-4 py-3 font-medium">Email</th>
                      <th className="px-4 py-3 font-medium">Affiliation</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {admins.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-muted-foreground">
                          No administrators yet.
                        </td>
                      </tr>
                    ) : (
                      admins.map((admin) => (
                        <tr
                          key={admin.id}
                          className={admin.isActive ? undefined : 'bg-muted/20 text-muted-foreground'}
                        >
                          <td className="px-4 py-3 font-medium text-foreground">
                            {admin.firstName} {admin.lastName}
                          </td>
                          <td className="px-4 py-3">{admin.email}</td>
                          <td className="px-4 py-3">
                            {churchAdminAffiliationLabel(
                              admin.affiliationKind,
                              admin.memberName,
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={
                                admin.isActive
                                  ? 'font-medium text-foreground'
                                  : 'font-medium text-muted-foreground'
                              }
                            >
                              {churchAdminStatusLabel(admin.isActive)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {admin.isActive ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => void onDeactivate(admin.id)}
                              >
                                Disable
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )
        ) : null}
      </section>
    </div>
  )
}
