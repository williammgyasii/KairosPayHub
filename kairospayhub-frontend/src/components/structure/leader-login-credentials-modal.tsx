import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'

export type GeneratedLeaderLogin = {
  email: string
  temporaryPassword: string
}

export function LeaderLoginCredentialsModal({
  credentials,
  leaderName,
  onClose,
}: {
  credentials: GeneratedLeaderLogin
  leaderName?: string
  onClose: () => void
}) {
  const [copiedField, setCopiedField] = useState<'email' | 'password' | 'all' | null>(null)

  async function copy(value: string, field: 'email' | 'password' | 'all') {
    await navigator.clipboard.writeText(value)
    setCopiedField(field)
    window.setTimeout(() => setCopiedField(null), 2000)
  }

  const allText = `Email: ${credentials.email}\nPassword: ${credentials.temporaryPassword}`

  return (
    <Modal
      open
      onOpenChange={(open) => !open && onClose()}
      title="Leader login created"
      description={
        leaderName
          ? `Login credentials were emailed to ${leaderName}. Copy below if they need them again.`
          : 'Login credentials were emailed to the leader. Copy below if they need them again.'
      }
    >
      <div className="space-y-4">
        <div className="rounded-lg border border-amber-200/80 bg-amber-500/10 px-4 py-3 text-sm text-amber-950">
          Copy these now — the password is only shown once.
        </div>

        <CredentialRow
          label="Email"
          value={credentials.email}
          copied={copiedField === 'email'}
          onCopy={() => void copy(credentials.email, 'email')}
        />

        <CredentialRow
          label="Password"
          value={credentials.temporaryPassword}
          copied={copiedField === 'password'}
          onCopy={() => void copy(credentials.temporaryPassword, 'password')}
          mono
        />

        <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => void copy(allText, 'all')}
          >
            {copiedField === 'all' ? (
              <>
                <Check className="size-4" />
                Copied
              </>
            ) : (
              <>
                <Copy className="size-4" />
                Copy both
              </>
            )}
          </Button>
          <Button type="button" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function CredentialRow({
  label,
  value,
  copied,
  onCopy,
  mono = false,
}: {
  label: string
  value: string
  copied: boolean
  onCopy: () => void
  mono?: boolean
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/10 px-3 py-2">
        <span className={mono ? 'min-w-0 flex-1 font-mono text-sm' : 'min-w-0 flex-1 text-sm'}>
          {value}
        </span>
        <Button type="button" variant="ghost" size="sm" className="shrink-0" onClick={onCopy}>
          {copied ? (
            <>
              <Check className="size-4" />
              Copied
            </>
          ) : (
            <>
              <Copy className="size-4" />
              Copy
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
