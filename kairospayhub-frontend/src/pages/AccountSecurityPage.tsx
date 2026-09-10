import { Link } from 'react-router-dom'
import { KeyRound, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function AccountSecurityPage() {
  return (
    <div className="max-w-lg space-y-5">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-rose-500 text-white">
          <Shield className="size-5" aria-hidden />
        </span>
        <div>
          <p className="text-sm font-semibold">Password & devices</p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Reset your password via email if you need to sign in on a new device or update your
            credentials.
          </p>
        </div>
      </div>
      <Button asChild variant="outline" size="sm">
        <Link to="/forgot-password">
          <KeyRound className="size-4" aria-hidden />
          Reset password
        </Link>
      </Button>
    </div>
  )
}
