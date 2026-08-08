import { format, parseISO, isValid } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

function parseDateValue(value: string): Date | undefined {
  if (!value) return undefined
  const parsed = parseISO(value)
  return isValid(parsed) ? parsed : undefined
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
  toYear = new Date().getFullYear(),
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
}) {
  const selected = parseDateValue(value)
  const startMonth = new Date(fromYear, 0)
  const endMonth = new Date(toYear, 11)

  return (
    <Popover modal>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          aria-required={required}
          className={cn(
            'h-9 w-full justify-start gap-2 px-3 text-left font-normal',
            !selected && 'text-muted-foreground',
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
          defaultMonth={selected ?? new Date(toYear - 25, 0)}
          startMonth={startMonth}
          endMonth={endMonth}
          disabled={{ after: new Date() }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}
