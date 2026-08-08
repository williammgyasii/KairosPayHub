import {
  capLocalPhoneDigits,
  localPhoneHint,
  PHONE_COUNTRIES,
  phoneCountryForDialCode,
} from '@/lib/phone-countries'
import { cn } from '@/lib/utils'

export function PhoneInput({
  id,
  dialCode,
  localNumber,
  onDialCodeChange,
  onLocalNumberChange,
  className,
  required,
}: {
  id: string
  dialCode: string
  localNumber: string
  onDialCodeChange: (dialCode: string) => void
  onLocalNumberChange: (localNumber: string) => void
  className?: string
  required?: boolean
}) {
  const country = phoneCountryForDialCode(dialCode)

  function handleDialCodeChange(nextDialCode: string) {
    onDialCodeChange(nextDialCode)
    onLocalNumberChange(capLocalPhoneDigits(nextDialCode, localNumber))
  }

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex gap-2">
        <select
          id={`${id}-country`}
          aria-label="Country code"
          className="h-9 w-[9.5rem] shrink-0 rounded-md border border-input bg-background px-2 text-sm"
          value={dialCode}
          onChange={(e) => handleDialCodeChange(e.target.value)}
        >
          {PHONE_COUNTRIES.map((item) => (
            <option key={item.code} value={item.dialCode}>
              {item.label}
            </option>
          ))}
        </select>
        <input
          id={id}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          required={required}
          maxLength={country.trunkPrefix ? country.nsnMaxLength + 1 : country.nsnMaxLength}
          className="flex h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder={country.placeholder}
          value={localNumber}
          onChange={(e) => onLocalNumberChange(capLocalPhoneDigits(dialCode, e.target.value))}
        />
      </div>
      <p className="text-[11px] text-muted-foreground">{localPhoneHint(dialCode)}</p>
    </div>
  )
}
