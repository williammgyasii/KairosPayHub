import { guestRiskWarning } from '@/lib/guest-risk-warning'
import { cn } from '@/lib/utils'

export function GuestRiskBanner({
  level,
  reasons,
}: {
  level?: string | null
  reasons?: string[] | null
}) {
  const warning = guestRiskWarning(level, reasons)
  if (!warning) return null

  return (
    <div
      role="status"
      className={cn(
        'rounded-md border px-3 py-2 text-sm',
        warning.tone === 'flagged'
          ? 'border-amber-400 bg-amber-50 text-amber-950'
          : 'border-amber-200 bg-amber-50/80 text-amber-900',
      )}
    >
      <p className="font-medium">{warning.title}</p>
      {warning.reasons.length > 0 ? (
        <ul className="mt-1 list-disc pl-4 text-xs">
          {warning.reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
