import type { RemittanceMedium } from '@/api/giving'
import { WizardField } from '@/components/structure/wizard-shell'
import { Input } from '@/components/ui/input'
import {
  bulkRemittanceDestinationLabel,
  bulkRemittanceOtherLabel,
  bulkRemittanceOtherPlaceholder,
  remittanceDestinationOptions,
  type ChurchPaymentMode,
} from '@/lib/giving-ui'

interface RemittanceDestinationFieldProps {
  id?: string
  role: string
  value: RemittanceMedium | ''
  otherValue: string
  onChange: (value: RemittanceMedium | '') => void
  onOtherChange: (value: string) => void
  disabled?: boolean
  paymentModes?: ChurchPaymentMode[]
}

export function RemittanceDestinationField({
  id = 'remittance-medium',
  role,
  value,
  otherValue,
  onChange,
  onOtherChange,
  disabled = false,
  paymentModes = [],
}: RemittanceDestinationFieldProps) {
  const options = remittanceDestinationOptions(role, paymentModes)
  const selected = options.find((option) => option.value === value)

  return (
    <>
      <WizardField label={bulkRemittanceDestinationLabel(role)} id={id} required>
        <select
          id={id}
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={value}
          disabled={disabled}
          required
          onChange={(event) =>
            onChange(event.target.value ? (event.target.value as RemittanceMedium) : '')
          }
        >
          <option value="">Select mode of payment…</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {selected?.hint && (
          <p className="text-[11px] text-muted-foreground">Send to: {selected.hint}</p>
        )}
        {paymentModes.length === 0 && (
          <p className="text-[11px] text-muted-foreground">
            PFCC managers will configure payment numbers in Settings soon.
          </p>
        )}
      </WizardField>

      {value === 'Other' && (
        <WizardField label={bulkRemittanceOtherLabel(role)} id={`${id}-other`} required>
          <Input
            id={`${id}-other`}
            value={otherValue}
            disabled={disabled}
            required
            onChange={(event) => onOtherChange(event.target.value)}
            placeholder={bulkRemittanceOtherPlaceholder(role)}
          />
        </WizardField>
      )}
    </>
  )
}
