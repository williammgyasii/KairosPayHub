import { useOutletContext } from 'react-router-dom'
import { useEffect, useState } from 'react'
import type { DashboardOutletContext } from '@/components/layout/dashboard-layout'
import { DashboardPageHeader } from '@/components/layout/dashboard-page-header'
import { ChurchBrand } from '@/components/layout/church-brand'
import { getAccessToken } from '@/auth/client'
import { apiBaseUrl } from '@/lib/api-base'
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
    <div className="space-y-6">
      <DashboardPageHeader
        breadcrumbs={[
          { label: 'Overview', to: '/' },
          { label: 'Settings', to: '/settings' },
          { label: 'Branding' },
        ]}
        title="Church branding"
        description="Upload a square logo (JPEG, PNG, or WebP, max 2 MB)."
      />

      <ChurchBrand churchName={me.churchName} logoUrl={logoUrl} />

      {error && <p className="text-sm text-destructive">{error}</p>}
      {message && <p className="text-sm text-primary">{message}</p>}

      <div className="space-y-2">
        <Label htmlFor="logo">Church logo</Label>
        <Input
          id="logo"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void onUpload(file)
          }}
        />
      </div>
    </div>
  )
}
