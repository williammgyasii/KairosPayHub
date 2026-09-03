import { CheckCircle2, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'

export type GeneratedLeaderLogin = {
  email: string
}

export function LeaderLoginSuccessModal({
  leaderEmail,
  leaderName,
  title = 'Leader login created',
  onClose,
}: {
  leaderEmail: string
  leaderName?: string
  title?: string
  onClose: () => void
}) {
  const recipient = leaderName?.trim() || 'the leader'

  return (
    <Modal
      open
      onOpenChange={(open) => !open && onClose()}
      title={title}
      description="They can get started from the email we just sent."
    >
      <div className="space-y-5 py-2 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
          <CheckCircle2 className="size-8" />
        </div>

        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            We emailed <span className="font-medium text-foreground">{recipient}</span> at{' '}
            <span className="font-medium text-foreground">{leaderEmail}</span> with a link to set
            their password and get started.
          </p>
          <p className="text-sm text-muted-foreground">
            They must set a password before they can sign in.
          </p>
        </div>

        <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/10 px-4 py-3 text-left text-sm text-muted-foreground">
          <Mail className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          <p>
            Ask them to check their inbox (and spam folder). The email contains a secure link to
            choose their password — nothing sensitive is shown in this app.
          </p>
        </div>

        <div className="flex justify-end border-t pt-4">
          <Button type="button" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Modal>
  )
}