/** Local dev only — Bunny webhooks cannot reach localhost. */
export const SERVICE_RECORDING_DEV_POLL_MS = 10_000

/**
 * Poll the recordings list while Bunny encodes. Production relies on the Bunny
 * webhook updating status; the list refetches on navigation and cache invalidation.
 */
export function serviceRecordingListPollingIntervalMs(
  hasInFlightRecordings: boolean,
  isDev: boolean = import.meta.env.DEV,
): number {
  if (!isDev || !hasInFlightRecordings) {
    return 0
  }
  return SERVICE_RECORDING_DEV_POLL_MS
}

export function serviceRecordingListHasInFlight(
  recordings: readonly { status: string }[],
): boolean {
  return recordings.some(
    (recording) => recording.status === 'Draft' || recording.status === 'Processing',
  )
}
