import { useEffect, useId, useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Camera } from 'lucide-react'
import { toast } from 'sonner'
import { displayName, type Me } from '@/api/auth'
import type { DashboardOutletContext } from '@/shared/layout/dashboard-layout'
import { getAccessToken } from '@/auth/client'
import { apiBaseUrl } from '@/shared/api/api-base'
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/ui/avatar'
import { Button } from '@/shared/ui/button'
import { Label } from '@/shared/ui/label'
import { initials } from '@/shared/lib/utils'

function withCacheBust(url: string): string {
  const sep = url.includes('?') ? '&' : '?'
  return `${url}${sep}v=${Date.now()}`
}

/** Personal photo for any signed-in user — Profile preview + feeds topbar via `me.avatarUrl`. */
export function ProfileAvatarSettingsSection({ me }: { me: Me & { onboarded: true } }) {
  const { reloadMe } = useOutletContext<DashboardOutletContext>()
  const [avatarUrl, setAvatarUrl] = useState(me.avatarUrl ?? null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputId = useId()
  const fileRef = useRef<HTMLInputElement>(null)
  const name = displayName(me)

  useEffect(() => {
    setAvatarUrl(me.avatarUrl ?? null)
  }, [me.avatarUrl])

  async function onUpload(file: File) {
    setUploading(true)
    setError(null)
    try {
      const token = getAccessToken()
      const body = new FormData()
      body.append('file', file)

      const res = await fetch(`${apiBaseUrl()}/api/me/avatar`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body,
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Upload failed')

      const nextUrl =
        typeof data.avatarUrl === 'string' ? withCacheBust(data.avatarUrl) : data.avatarUrl
      setAvatarUrl(nextUrl ?? null)
      await reloadMe()
      toast.success('Photo updated')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <section className="space-y-3 border-b border-border/50 pb-8">
      <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Camera className="size-3.5" aria-hidden />
        Your photo
      </p>
      <div className="flex flex-wrap items-center gap-4">
        <Avatar className="size-16 ring-1 ring-border/60">
          {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
          <AvatarFallback className="bg-primary/10 text-base font-semibold text-primary">
            {initials(me.name, me.email)}
          </AvatarFallback>
        </Avatar>
        <div className="space-y-1.5">
          <Label htmlFor={inputId} className="sr-only">
            Upload photo
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
            {uploading ? 'Uploading…' : avatarUrl ? 'Change photo' : 'Upload photo'}
          </Button>
          <p className="text-[11px] text-muted-foreground">
            Shown in the top bar · JPEG, PNG, or WebP · Max 2 MB
            {name ? ` · ${name}` : ''}
          </p>
        </div>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </section>
  )
}
