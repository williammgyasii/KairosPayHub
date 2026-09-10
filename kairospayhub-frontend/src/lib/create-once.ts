/** Synchronous lock so a slow submit cannot start twice. */
export function createOnceLock() {
  let started = false
  return {
    tryStart(): boolean {
      if (started) return false
      started = true
      return true
    },
    reset() {
      started = false
    },
  }
}
