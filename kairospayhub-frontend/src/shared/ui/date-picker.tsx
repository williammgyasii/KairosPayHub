import { format, isAfter, isBefore, isValid, parseISO, startOfDay } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Calendar } from '@/shared/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover'
import { cn } from '@/shared/lib/utils'

function parseDateValue(value: string): Date | undefined {
  if (!value.trim()) return undefined
  const parsed = parseISO(value.trim())
  return isValid(parsed) ? startOfDay(parsed) : undefined
}

export function DatePicker({
  id,
  value,
  onChange,
  placeholder = 'Pick a date',
  className,
  disabled,
  required,
  fromYear = 1940,
  toYear = new Date().getFullYear() + 5,
  minDate,
  maxDate,
  disablePast = false,
  disableFuture = false,
  invalid = false,
}: {
  id?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  required?: boolean
  fromYear?: number
  toYear?: number
  minDate?: string
  maxDate?: string
  disablePast?: boolean
  disableFuture?: boolean
  invalid?: boolean
}) {
  const selected = parseDateValue(value)
  const startMonth = new Date(fromYear, 0)
  const endMonth = new Date(toYear, 11)
  const min = minDate ? parseDateValue(minDate) : undefined
  const max = maxDate ? parseDateValue(maxDate) : undefined
  const today = startOfDay(new Date())

  function isDisabled(date: Date) {
    const day = startOfDay(date)
    if (disableFuture && isAfter(day, today)) return true
    if (disablePast && isBefore(day, today)) return true
    if (min && isBefore(day, min)) return true
    if (max && isAfter(day, max)) return true
    return false
  }

  return (
    <Popover modal>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          aria-required={required}
          aria-invalid={invalid}
          className={cn(
            'h-10 w-full justify-start gap-2 px-3 text-left font-normal',
            !selected && 'text-muted-foreground',
            invalid && 'border-destructive ring-1 ring-destructive/30',
            className,
          )}
        >
          <CalendarIcon className="size-4 shrink-0 opacity-60" />
          {selected ? format(selected, 'PPP') : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          captionLayout="dropdown"
          hideNavigation
          selected={selected}
          onSelect={(date) => onChange(date ? format(date, 'yyyy-MM-dd') : '')}
          defaultMonth={selected ?? max ?? min ?? today}
          startMonth={startMonth}
          endMonth={endMonth}
          disabled={isDisabled}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}
