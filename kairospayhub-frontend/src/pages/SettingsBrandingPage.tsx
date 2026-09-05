import { useOutletContext } from 'react-router-dom'
import { useEffect, useState } from 'react'
import type { DashboardOutletContext } from '@/components/layout/dashboard-layout'
import { ChurchBrand } from '@/components/layout/church-brand'
import { getAccessToken } from '@/auth/client'
import { apiBaseUrl } from '@/lib/api-base'
import {
  SettingsField,
  SettingsFieldGrid,
  SettingsPanel,
  SettingsSection,
} from '@/components/settings/settings-section'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function SettingsBrandingPage() {
  const { me, reloadMe } = useOutletContext<DashboardOutletContext>()
  const [logoUrl, setLogoUrl] = useState(me.churchLogoUrl)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    setLogoUrl(me.churchLogoUrl)
  }, [me.churchLogoUrl])

  async function onUpload(file: File) {
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const token = getAccessToken()
      const body = new FormData()
      body.append('file', file)

      const res = await fetch(`${apiBaseUrl()}/api/church/logo`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body,
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Upload failed')

      setLogoUrl(data.logoUrl)
      await reloadMe()
      setMessage('Logo updated.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-8">
      <SettingsSection
        title="Church identity"
        description="Your logo appears in the sidebar, dashboard, and across the workspace."
      >
        <div className="grid gap-5 lg:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] lg:items-start">
          <SettingsPanel className="flex flex-col items-center justify-center gap-3 text-center">
            <ChurchBrand churchName={me.churchName} logoUrl={logoUrl} />
            <p className="text-xs text-muted-foreground">Current preview</p>
          </SettingsPanel>

          <div className="space-y-4">
            <SettingsFieldGrid columns={2}>
              <SettingsField label="Church name" value={me.churchName ?? '—'} />
              <SettingsField
                label="Default currency"
                value={me.defaultCurrency ?? '—'}
              />
            </SettingsFieldGrid>

            <div className="space-y-2">
              <Label htmlFor="logo">Upload logo</Label>
              <Input
                id="logo"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={busy}
                className="max-w-md"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) void onUpload(file)
                }}
              />
              <p className="text-xs text-muted-foreground">
                Square image · JPEG, PNG, or WebP · Max 2 MB
              </p>
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            {message ? <p className="text-sm text-primary">{message}</p> : null}
          </div>
        </div>
      </SettingsSection>
    </div>
  )
}
