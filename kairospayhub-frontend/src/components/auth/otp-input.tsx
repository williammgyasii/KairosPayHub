import { useRef } from 'react'
import type { ClipboardEvent, KeyboardEvent } from 'react'
import { cn } from '@/lib/utils'

const LENGTH = 6

interface OtpInputProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  autoFocus?: boolean
}

export function OtpInput({ value, onChange, disabled, autoFocus }: OtpInputProps) {
  const inputsRef = useRef<Array<HTMLInputElement | null>>([])

  const digits = Array.from({ length: LENGTH }, (_, i) => value[i] ?? '')

  function focusIndex(index: number) {
    const input = inputsRef.current[index]
    input?.focus()
    input?.select()
  }

  function applyDigits(next: string[]) {
    onChange(next.join('').slice(0, LENGTH))
  }

  function handleChange(index: number, char: string) {
    const digit = char.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[index] = digit
    applyDigits(next)
    if (digit && index < LENGTH - 1) focusIndex(index + 1)
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      focusIndex(index - 1)
    }
    if (e.key === 'ArrowLeft' && index > 0) focusIndex(index - 1)
    if (e.key === 'ArrowRight' && index < LENGTH - 1) focusIndex(index + 1)
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, LENGTH)
    if (!pasted) return
    applyDigits(pasted.split(''))
    focusIndex(Math.min(pasted.length, LENGTH - 1))
  }

  return (
    <div className="flex justify-center gap-2 sm:gap-2.5">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            inputsRef.current[index] = el
          }}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          autoFocus={autoFocus && index === 0}
          maxLength={1}
          value={digit}
          disabled={disabled}
          aria-label={`Digit ${index + 1} of ${LENGTH}`}
          className={cn(
            'size-11 rounded-xl border-2 bg-background text-center text-lg font-semibold tabular-nums transition-all sm:size-12',
            digit
              ? 'border-primary/50 bg-primary/[0.04] text-foreground shadow-sm'
              : 'border-border/80 text-foreground',
            'focus-visible:border-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15',
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
        />
      ))}
    </div>
  )
}
