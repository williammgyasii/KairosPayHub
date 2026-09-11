import { useEffect, useId, useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Church, Pencil, X } from 'lucide-react'
import { toast } from 'sonner'
import type { DashboardOutletContext } from '@/components/layout/dashboard-layout'
import { ChurchBrand } from '@/components/layout/church-brand'
import { getAccessToken } from '@/auth/client'
import { apiBaseUrl } from '@/lib/api-base'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

function withCacheBust(url: string): string {
  const sep = url.includes('?') ? '&' : '?'
  return `${url}${sep}v=${Date.now()}`
}

/** Church identity for managers — same edit/view grid pattern as personal Profile. */
export function ChurchLogoSettingsSection() {
  const { me, reloadMe } = useOutletContext<DashboardOutletContext>()
  const [editing, setEditing] = useState(false)
  const [churchName, setChurchName] = useState(me.churchName ?? '')
  const [logoUrl, setLogoUrl] = useState(me.churchLogoUrl)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputId = useId()
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!editing) setChurchName(me.churchName ?? '')
  }, [me.churchName, editing])

  useEffect(() => {
    setLogoUrl(me.churchLogoUrl)
  }, [me.churchLogoUrl])

  function startEdit() {
    setChurchName(me.churchName ?? '')
    setError(null)
    setEditing(true)
  }

  function cancelEdit() {
    setChurchName(me.churchName ?? '')
    setError(null)
    setEditing(false)
  }

  async function saveProfile() {
    const trimmed = churchName.trim()
    if (!trimmed) {
      setError('Church name is required')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const token = getAccessToken()
      const res = await fetch(`${apiBaseUrl()}/api/church`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ name: trimmed }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Save failed')
      await reloadMe()
      toast.success('Church profile saved')
      setEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function onUpload(file: File) {
    setUploading(true)
    setError(null)
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

      const nextUrl = typeof data.logoUrl === 'string' ? withCacheBust(data.logoUrl) : data.logoUrl
      setLogoUrl(nextUrl)
      await reloadMe()
      toast.success('Logo updated')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <section className="space-y-3 border-b border-border/50 pb-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <p
          className={cn(
            'inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide',
            'text-amber-800 dark:text-amber-300',
          )}
        >
          <Church className="size-3.5" aria-hidden />
          Church
        </p>
        {!editing ? (
          <Button type="button" className="w-full shrink-0 sm:w-auto" onClick={startEdit}>
            <Pencil className="size-4" aria-hidden />
            Edit church
          </Button>
        ) : (
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              disabled={saving}
              onClick={cancelEdit}
            >
              <X className="size-4" aria-hidden />
              Cancel
            </Button>
            <Button
              type="button"
              className="w-full sm:w-auto"
              disabled={saving}
              onClick={() => void saveProfile()}
            >
              {saving ? 'Saving…' : 'Save church'}
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
        {editing ? (
          <div className="grid gap-1.5">
            <Label htmlFor="church-name" className="text-xs font-medium">
              Church name
            </Label>
            <Input
              id="church-name"
              value={churchName}
              onChange={(e) => setChurchName(e.target.value)}
              disabled={saving}
              autoComplete="organization"
            />
          </div>
        ) : (
          <ReadOnlyField label="Church name" value={me.churchName} />
        )}
        <div className="grid gap-1.5">
          <Label htmlFor="church-currency" className="text-xs font-medium">
            Default currency
          </Label>
          <Input
            id="church-currency"
            value={me.defaultCurrency ?? '—'}
            disabled
            readOnly
          />
          <p className="text-[11px] text-muted-foreground">Set from country at onboarding.</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Logo</p>
          <div className="flex flex-wrap items-center gap-3">
            <ChurchBrand churchName={me.churchName} logoUrl={logoUrl} logoOnly />
            <div className="space-y-1.5">
              <Label htmlFor={inputId} className="sr-only">
                Upload logo
              </Label>
              <input
                ref={fileRef}
                id={inputId}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={uploading}
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) void onUpload(file)
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
              >
                {uploading ? 'Uploading…' : logoUrl ? 'Change logo' : 'Upload logo'}
              </Button>
              <p className="text-[11px] text-muted-foreground">
                Square · JPEG, PNG, or WebP · Max 2 MB
              </p>
            </div>
          </div>
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </section>
  )
}

function ReadOnlyField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="min-w-0 space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="truncate text-sm font-medium text-foreground">{value?.trim() || '—'}</p>
    </div>
  )
}
