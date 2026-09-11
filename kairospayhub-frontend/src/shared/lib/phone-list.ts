export const PHONE_LIST_MAX_WIDTH_PX = 767
export const PHONE_LIST_EMPTY_VALUE = '—'

export type PhoneListDetail = {
  label: string
  value: string
}

export type PhoneListCard = {
  title: string
  lines: string[]
  details: PhoneListDetail[]
}

export function phoneListCard(input: {
  title: string
  lines?: Array<string | null | undefined>
  details: Array<{ label: string; value: string | null | undefined }>
}): PhoneListCard {
  return {
    title: input.title.trim() || PHONE_LIST_EMPTY_VALUE,
    lines: (input.lines ?? [])
      .map((line) => (line ?? '').trim())
      .filter(Boolean)
      .slice(0, 2),
    details: input.details.map((detail) => ({
      label: detail.label,
      value: (detail.value ?? '').trim() || PHONE_LIST_EMPTY_VALUE,
    })),
  }
}

export function isPhoneListViewport(widthPx: number): boolean {
  return widthPx <= PHONE_LIST_MAX_WIDTH_PX
}

export function labeledPhoneCard(
  title: string,
  lines: Array<string | null | undefined>,
  details: Array<{ label: string; value: string | number | null | undefined }>,
) {
  return phoneListCard({
    title,
    lines,
    details: details.map((detail) => ({
      label: detail.label,
      value: detail.value == null ? null : String(detail.value),
    })),
  })
}
