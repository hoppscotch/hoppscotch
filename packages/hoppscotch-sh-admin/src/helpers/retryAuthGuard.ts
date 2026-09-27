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
 * NOTE: This is a copy of `@hoppscotch/common/helpers/retryAuthGuard.ts`.
 * `sh-admin` cannot depend on `@hoppscotch/common`, so the utility is
 * duplicated here. Keep both copies in sync.
 *
 * @see https://github.com/hoppscotch/hoppscotch/issues/5885
 */
export function createAuthRetryGuard(onExhausted: () => void | Promise<void>) {
  let failCount = 0
  let isExhausted = false
  let exhaustionPromise: Promise<void> | null = null

  return {
    /**
     * Wraps an auth refresh attempt with retry tracking.
     * Resets on success. Calls `onExhausted` after {@link MAX_RETRIES}
     * consecutive failures and stays exhausted until `reset()` is called.
     */
    async execute(refreshFn: () => Promise<boolean>): Promise<boolean> {
      // isExhausted covers the normal path; failCount >= MAX_RETRIES covers
      // the concurrent-call edge case where two callers both passed the check
      // at failCount = 2 before either could set isExhausted = true.
      if (isExhausted || failCount >= MAX_RETRIES) {
        return false
      }

      let success: boolean
      try {
        success = await refreshFn()
      } catch (_) {
        // Treat thrown errors (network failures, etc.) as a failed refresh
        // so they count toward exhaustion and don't bypass the guard.
        success = false
      }

      if (success) {
        failCount = 0
        return true
      }

      failCount++
      if (failCount >= MAX_RETRIES && !isExhausted) {
        isExhausted = true
        try {
          exhaustionPromise = Promise.resolve().then(() => onExhausted())
          await exhaustionPromise
        } catch (_) {
          // Sign-out failed (e.g. network error), but the guard stays
          // exhausted so we don't re-enter the refresh loop.
        } finally {
          exhaustionPromise = null
        }
      }

      return false
    },

    /**
     * Reset the failure counter (e.g. on login or manual logout).
     * No-op while an exhaustion callback (sign-out) is still in-flight.
     */
    reset() {
      if (exhaustionPromise) return

      failCount = 0
      isExhausted = false
    },
  }
}
