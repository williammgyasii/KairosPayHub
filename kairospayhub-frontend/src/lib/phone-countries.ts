export type PhoneCountry = {
  code: string
  dialCode: string
  label: string
  /** National number length after removing trunk prefix (e.g. leading 0). */
  nsnMaxLength: number
  /** Local trunk prefix replaced by the country dial code (usually 0). */
  trunkPrefix?: string
  placeholder: string
}

/**
 * NSN lengths from ITU / common mobile numbering plans.
 * Ghana: 10 local digits incl. 0 → 9 NSN; +233 replaces the 0.
 */
export const PHONE_COUNTRIES: PhoneCountry[] = [
  {
    code: 'GH',
    dialCode: '233',
    label: 'Ghana (+233)',
    nsnMaxLength: 9,
    trunkPrefix: '0',
    placeholder: '024 123 4567',
  },
  {
    code: 'NG',
    dialCode: '234',
    label: 'Nigeria (+234)',
    nsnMaxLength: 10,
    trunkPrefix: '0',
    placeholder: '0803 123 4567',
  },
  {
    code: 'US',
    dialCode: '1',
    label: 'United States (+1)',
    nsnMaxLength: 10,
    placeholder: '202 555 0100',
  },
  {
    code: 'GB',
    dialCode: '44',
    label: 'United Kingdom (+44)',
    nsnMaxLength: 10,
    trunkPrefix: '0',
    placeholder: '07123 456789',
  },
  {
    code: 'CA',
    dialCode: '1',
    label: 'Canada (+1)',
    nsnMaxLength: 10,
    placeholder: '416 555 0100',
  },
  {
    code: 'ZA',
    dialCode: '27',
    label: 'South Africa (+27)',
    nsnMaxLength: 9,
    trunkPrefix: '0',
    placeholder: '082 123 4567',
  },
  {
    code: 'KE',
    dialCode: '254',
    label: 'Kenya (+254)',
    nsnMaxLength: 9,
    trunkPrefix: '0',
    placeholder: '0712 345678',
  },
  {
    code: 'CI',
    dialCode: '225',
    label: "Côte d'Ivoire (+225)",
    nsnMaxLength: 10,
    trunkPrefix: '0',
    placeholder: '01 23 45 67 89',
  },
  {
    code: 'TG',
    dialCode: '228',
    label: 'Togo (+228)',
    nsnMaxLength: 8,
    trunkPrefix: '0',
    placeholder: '90 12 34 56',
  },
  {
    code: 'BJ',
    dialCode: '229',
    label: 'Benin (+229)',
    nsnMaxLength: 8,
    trunkPrefix: '0',
    placeholder: '90 12 34 56',
  },
]

export const DEFAULT_PHONE_COUNTRY = PHONE_COUNTRIES[0]

export function phoneCountryForDialCode(dialCode: string): PhoneCountry {
  return PHONE_COUNTRIES.find((c) => c.dialCode === dialCode) ?? DEFAULT_PHONE_COUNTRY
}

/** Strip non-digits and enforce per-country NSN / trunk rules while typing. */
export function capLocalPhoneDigits(dialCode: string, raw: string): string {
  const country = phoneCountryForDialCode(dialCode)
  const digits = raw.replace(/\D/g, '')
  if (!digits) return ''

  const trunk = country.trunkPrefix
  if (trunk && digits.startsWith(trunk)) {
    const nsn = digits.slice(1, 1 + country.nsnMaxLength)
    return nsn.length > 0 ? trunk + nsn : trunk
  }

  return digits.slice(0, country.nsnMaxLength)
}

export function isLocalPhoneComplete(dialCode: string, localNumber: string): boolean {
  const country = phoneCountryForDialCode(dialCode)
  const digits = capLocalPhoneDigits(dialCode, localNumber).replace(/\D/g, '')
  if (!digits) return false

  const nsn =
    country.trunkPrefix && digits.startsWith(country.trunkPrefix)
      ? digits.slice(country.trunkPrefix.length)
      : digits

  return nsn.length === country.nsnMaxLength
}

export function localPhoneHint(dialCode: string): string {
  const country = phoneCountryForDialCode(dialCode)
  if (country.trunkPrefix) {
    return `Up to ${country.nsnMaxLength + 1} digits with leading ${country.trunkPrefix}, or ${country.nsnMaxLength} without`
  }
  return `Up to ${country.nsnMaxLength} digits`
}

export function formatPhoneE164(dialCode: string, localNumber: string): string | null {
  const capped = capLocalPhoneDigits(dialCode, localNumber)
  const digits = capped.replace(/\D/g, '')
  if (!digits) return null

  const country = phoneCountryForDialCode(dialCode)
  const normalized =
    country.trunkPrefix && digits.startsWith(country.trunkPrefix)
      ? digits.slice(country.trunkPrefix.length)
      : digits

  if (!normalized) return null
  return `+${dialCode}${normalized}`
}

export function parsePhoneE164(
  phone: string | null | undefined,
): { dialCode: string; localNumber: string } {
  if (!phone?.trim()) {
    return { dialCode: DEFAULT_PHONE_COUNTRY.dialCode, localNumber: '' }
  }

  const trimmed = phone.trim()
  if (!trimmed.startsWith('+')) {
    return {
      dialCode: DEFAULT_PHONE_COUNTRY.dialCode,
      localNumber: capLocalPhoneDigits(DEFAULT_PHONE_COUNTRY.dialCode, trimmed),
    }
  }

  const sorted = [...PHONE_COUNTRIES].sort((a, b) => b.dialCode.length - a.dialCode.length)
  for (const country of sorted) {
    const prefix = `+${country.dialCode}`
    if (trimmed.startsWith(prefix)) {
      const local = trimmed.slice(prefix.length)
      return {
        dialCode: country.dialCode,
        localNumber: capLocalPhoneDigits(country.dialCode, local),
      }
    }
  }

  return {
    dialCode: DEFAULT_PHONE_COUNTRY.dialCode,
    localNumber: capLocalPhoneDigits(DEFAULT_PHONE_COUNTRY.dialCode, trimmed.replace(/^\+/, '')),
  }
}
