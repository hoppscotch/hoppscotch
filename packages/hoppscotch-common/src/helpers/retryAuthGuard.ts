/**
 * Maximum number of consecutive auth refresh failures before signing out.
 * @see https://github.com/hoppscotch/hoppscotch/issues/5885
 */
const MAX_RETRIES = 3

/**
 * Creates an auth retry guard that tracks consecutive refresh failures
 * and triggers a sign-out after {@link MAX_RETRIES} consecutive failures.
 *
 * After exhaustion, subsequent calls short-circuit to `false` without
 * invoking `refreshFn` or `onExhausted` again. Call `reset()` on
 * successful login to re-enable refresh attempts.
 *
 * @see https://github.com/hoppscotch/hoppscotch/issues/5885
 */
export function createAuthRetryGuard(onExhausted: () => void | Promise<void>) {
  let failCount = 0
  let isExhausted = false

  return {
    /**
     * Wraps an auth refresh attempt with retry tracking.
     * Resets on success. Calls `onExhausted` after {@link MAX_RETRIES}
     * consecutive failures and stays exhausted until `reset()` is called.
     */
    async execute(refreshFn: () => Promise<boolean>): Promise<boolean> {
      if (isExhausted || failCount >= MAX_RETRIES) {
        return false
      }

      const success = await refreshFn()

      if (success) {
        failCount = 0
        return true
      }

      failCount++
      if (failCount >= MAX_RETRIES && !isExhausted) {
        isExhausted = true
        await onExhausted()
      }

      return false
    },

    /** Reset the failure counter (e.g. on login or manual logout). */
    reset() {
      failCount = 0
      isExhausted = false
    },
  }
}
