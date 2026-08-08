import { useOutletContext } from 'react-router-dom'
import { useEffect, useState } from 'react'
import type { DashboardOutletContext } from '@/components/layout/dashboard-layout'
import { DashboardPageHeader } from '@/components/layout/dashboard-page-header'
import { ChurchBrand } from '@/components/layout/church-brand'
import { getAccessToken } from '@/auth/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function SettingsPage() {
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

      const res = await fetch(`${import.meta.env.VITE_API_URL.replace(/\/+$/, '')}/api/church/logo`, {
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
          { label: 'Settings' },
        ]}
        title="Settings"
        description="Manage your church branding and account preferences."
      />

      <Card>
        <CardHeader>
          <CardTitle>Church branding</CardTitle>
          <CardDescription>
            Upload a square logo (JPEG, PNG, or WebP, max 2 MB). Stored in Cloudflare R2.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
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

          <p className="text-xs text-muted-foreground">
            Enable public access on your R2 bucket and set{' '}
            <code className="rounded bg-muted px-1">R2__PublicBaseUrl</code> on the API (r2.dev URL or
            custom domain like assets.kairospayhub.com).
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>{me.email}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" disabled>
            More settings soon
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
