import { useCallback, useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
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
  SettingsFieldGrid,
  SettingsPanel,
  SettingsSection,
} from '@/components/settings/settings-section'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import {
  EmailAvailabilityField,
  isEmailAvailabilityBlocking,
  useEmailAvailability,
} from '@/components/structure/email-availability-field'

export function SettingsAdministratorsPage() {
  const { me } = useOutletContext<DashboardOutletContext>()
  const api = useApi()
  const [admins, setAdmins] = useState<ChurchAdministrator[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [affiliationKind, setAffiliationKind] = useState<ChurchAdminAffiliationKind>('External')
  const [password, setPassword] = useState('')
  const [sendInvite, setSendInvite] = useState(false)
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
      setEmail(result.email)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not suggest email')
    }
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setFormError(null)
    try {
      await createAdministrator(api, {
        firstName,
        lastName,
        email,
        affiliationKind,
        password: sendInvite ? undefined : password,
        sendInviteEmail: sendInvite,
      })
      setFirstName('')
      setLastName('')
      setEmail('')
      setPassword('')
      await load()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not create administrator')
    } finally {
      setSaving(false)
    }
  }

  async function onDeactivate(id: string) {
    try {
      await deactivateAdministrator(api, id)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not deactivate administrator')
    }
  }

  return (
    <div className="space-y-8">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="grid gap-8 xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] xl:items-start">
        <SettingsSection
          title="Add administrator"
          description="Backup accounts with full church access when the pastor is unavailable."
          className="border-0 pb-0 xl:border-b-0"
        >
          <form onSubmit={onCreate} className="space-y-4">
            <SettingsFieldGrid>
              <div className="space-y-2">
                <Label htmlFor="firstName">First name</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last name</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
            </SettingsFieldGrid>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <EmailAvailabilityField
                id="email"
                email={email}
                onChange={setEmail}
                scope="login"
                required
                label="Email (must be unique)"
                className="min-w-0 flex-1"
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

            <div className="space-y-2">
              <Label>Affiliation</Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={affiliationKind === 'External' ? 'default' : 'outline'}
                  onClick={() => setAffiliationKind('External')}
                >
                  External
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={affiliationKind === 'InChurch' ? 'default' : 'outline'}
                  onClick={() => setAffiliationKind('InChurch')}
                  disabled
                  title="Member linking coming soon"
                >
                  In church
                </Button>
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                className="size-3.5 accent-primary"
                checked={sendInvite}
                onChange={(e) => setSendInvite(e.target.checked)}
              />
              Send set-password email instead of setting password now
            </label>

            {!sendInvite ? (
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required={!sendInvite}
                />
              </div>
            ) : null}

            {formError ? <p className="text-sm text-destructive">{formError}</p> : null}

            <Button
              type="submit"
              size="sm"
              disabled={saving || isEmailAvailabilityBlocking(email, emailAvailability)}
            >
              {saving ? 'Creating…' : 'Create administrator'}
            </Button>
          </form>
        </SettingsSection>

        <SettingsSection
          title="Active administrators"
          description="People who can manage the church when you are away."
          className="min-w-0 border-0 pb-0"
        >
          {loading ? (
            <Spinner label="Loading administrators…" />
          ) : (
            <SettingsPanel className="overflow-hidden p-0">
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
                        <tr key={admin.id}>
                          <td className="px-4 py-3 font-medium">
                            {admin.firstName} {admin.lastName}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{admin.email}</td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {admin.affiliationKind === 'InChurch'
                              ? admin.memberName ?? 'In church'
                              : 'External'}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={
                                admin.isActive
                                  ? 'text-foreground'
                                  : 'text-muted-foreground'
                              }
                            >
                              {admin.isActive ? 'Active' : 'Inactive'}
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
                                Deactivate
                              </Button>
                            ) : null}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </SettingsPanel>
          )}
        </SettingsSection>
      </div>
    </div>
  )
}
