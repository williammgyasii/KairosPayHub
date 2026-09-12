import { membershipCallHref } from '@/features/roster/lib/membership-row-presentation'
import { cn } from '@/shared/lib/utils'

export function MemberPhoneLink({
  phone,
  className,
}: {
  phone: string
  className?: string
}) {
  const href = membershipCallHref(phone)
  if (!href) {
    return <span className={cn('text-muted-foreground', className)}>{phone || '—'}</span>
  }

  return (
    <a
      href={href}
      className={cn('tabular-nums text-primary underline-offset-2 hover:underline', className)}
      onClick={(event) => event.stopPropagation()}
    >
      {phone}
    </a>
  )
}
