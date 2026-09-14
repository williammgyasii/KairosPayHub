export const MAX_SERVICE_RECORDING_TITLE_LENGTH = 200
export const MAX_SERVICE_RECORDING_DESCRIPTION_LENGTH = 2000

export type ServiceRecordingFormValidationOptions = {
  existingTitles: readonly string[]
  excludeTitle?: string | null
}

function normalizeTitle(title: string) {
  return title.trim().toLowerCase()
}

export function serviceRecordingTitleExists(
  title: string,
  existingTitles: readonly string[],
  excludeTitle?: string | null,
): boolean {
  const normalized = normalizeTitle(title)
  if (!normalized) return false
  const excluded = excludeTitle ? normalizeTitle(excludeTitle) : null
  return existingTitles.some((existing) => {
    const candidate = normalizeTitle(existing)
    if (!candidate) return false
    if (excluded && candidate === excluded) return false
    return candidate === normalized
  })
}

export function validateServiceRecordingTitle(
  title: string,
  options: ServiceRecordingFormValidationOptions,
): string | null {
  const trimmed = title.trim()
  if (!trimmed) {
    return 'Title is required.'
  }
  if (trimmed.length > MAX_SERVICE_RECORDING_TITLE_LENGTH) {
    return `Title must be ${MAX_SERVICE_RECORDING_TITLE_LENGTH} characters or fewer.`
  }
  if (serviceRecordingTitleExists(trimmed, options.existingTitles, options.excludeTitle)) {
    return 'A recording with this title already exists.'
  }
  return null
}

export function validateServiceRecordingDescription(description: string): string | null {
  const trimmed = description.trim()
  if (trimmed.length > MAX_SERVICE_RECORDING_DESCRIPTION_LENGTH) {
    return `Description must be ${MAX_SERVICE_RECORDING_DESCRIPTION_LENGTH} characters or fewer.`
  }
  return null
}
