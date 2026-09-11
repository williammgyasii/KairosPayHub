import {
  capLocalPhoneDigits,
  localPhoneHint,
  phoneCountriesPreferring,
  phoneCountryForDialCode,
} from '@/lib/phone-countries'
import { cn } from '@/shared/lib/utils'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/shared/ui/select'

export function PhoneInput({
  id,
  dialCode,
  localNumber,
  onDialCodeChange,
  onLocalNumberChange,
  className,
  required,
  preferredCountryCode,
}: {
  id: string
  dialCode: string
  localNumber: string
  onDialCodeChange: (dialCode: string) => void
  onLocalNumberChange: (localNumber: string) => void
  className?: string
  required?: boolean
  preferredCountryCode?: string | null
}) {
  const country = phoneCountryForDialCode(dialCode)
  const countries = phoneCountriesPreferring(preferredCountryCode)

  function handleCountryChange(code: string) {
    const next = countries.find((item) => item.code === code)
    if (!next) return
    onDialCodeChange(next.dialCode)
    onLocalNumberChange(capLocalPhoneDigits(next.dialCode, localNumber))
  }

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex gap-2">
        <Select value={country.code} onValueChange={handleCountryChange}>
          <SelectTrigger
            aria-label="Country code"
            className="h-10 w-[5.5rem] shrink-0 px-2"
          >
            <span className="tabular-nums">+{dialCode}</span>
          </SelectTrigger>
          <SelectContent>
            {countries.map((item) => (
              <SelectItem key={item.code} value={item.code}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative min-w-0 flex-1">
          <input
            id={id}
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            required={required}
            maxLength={country.trunkPrefix ? country.nsnMaxLength + 1 : country.nsnMaxLength}
            className="flex h-10 w-full min-w-0 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder={country.placeholder}
            value={localNumber}
            onChange={(e) => onLocalNumberChange(capLocalPhoneDigits(dialCode, e.target.value))}
          />
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">{localPhoneHint(dialCode)}</p>
    </div>
  )
}
