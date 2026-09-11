import { Bell, Mail } from 'lucide-react'
import { Button } from '@/shared/ui/button'

export function AccountNotificationsPage() {
  return (
    <div className="max-w-lg space-y-6">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white">
          <Bell className="size-5" aria-hidden />
        </span>
        <div>
          <p className="text-sm font-semibold">In-app alerts</p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Use the bell in the top bar for real-time alerts from your team. Email and push
            preferences are coming soon.
          </p>
        </div>
      </div>
      <Button variant="outline" size="sm" disabled>
        <Mail className="size-4" aria-hidden />
        Manage preferences (soon)
      </Button>
    </div>
  )
}
