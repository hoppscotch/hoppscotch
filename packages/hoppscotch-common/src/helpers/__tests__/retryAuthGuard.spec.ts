import { describe, test, expect, vi } from "vitest"
import { createAuthRetryGuard } from "../retryAuthGuard"

const refreshSuccess = () => Promise.resolve(true)
const refreshFailure = () => Promise.resolve(false)
const refreshThrow = () => Promise.reject(new Error("network error"))

describe("createAuthRetryGuard", () => {
  describe("success resets failure count", () => {
    test("returns true on successful refresh", async () => {
      const guard = createAuthRetryGuard(vi.fn())

      expect(await guard.execute(refreshSuccess)).toBe(true)
    })

    test("resets failure count after a success", async () => {
      const onExhausted = vi.fn()
      const guard = createAuthRetryGuard(onExhausted)

      // Accumulate 2 failures
      await guard.execute(refreshFailure)
      await guard.execute(refreshFailure)

      // Success resets the counter
      await guard.execute(refreshSuccess)

      // 3 more failures needed to exhaust
      await guard.execute(refreshFailure)
      await guard.execute(refreshFailure)
      expect(onExhausted).not.toHaveBeenCalled()

      await guard.execute(refreshFailure)
      expect(onExhausted).toHaveBeenCalledOnce()
    })
  })

  describe("exhaustion after MAX_RETRIES (3)", () => {
    test("calls onExhausted after 3 consecutive failures", async () => {
      const onExhausted = vi.fn()
      const guard = createAuthRetryGuard(onExhausted)

      await guard.execute(refreshFailure)
      await guard.execute(refreshFailure)
      expect(onExhausted).not.toHaveBeenCalled()

      await guard.execute(refreshFailure)
      expect(onExhausted).toHaveBeenCalledOnce()
    })

    test("returns false for every failed attempt", async () => {
      const guard = createAuthRetryGuard(vi.fn())

      expect(await guard.execute(refreshFailure)).toBe(false)
      expect(await guard.execute(refreshFailure)).toBe(false)
      expect(await guard.execute(refreshFailure)).toBe(false)
    })

    test("short-circuits to false after exhaustion without calling refreshFn", async () => {
      const guard = createAuthRetryGuard(vi.fn())

      // Exhaust the guard
      await guard.execute(refreshFailure)
      await guard.execute(refreshFailure)
      await guard.execute(refreshFailure)

      const refreshFn = vi.fn(refreshSuccess)
      expect(await guard.execute(refreshFn)).toBe(false)
      expect(refreshFn).not.toHaveBeenCalled()
    })
  })

  describe("onExhausted runs at most once", () => {
    test("does not call onExhausted again on subsequent execute calls", async () => {
      const onExhausted = vi.fn()
      const guard = createAuthRetryGuard(onExhausted)

      await guard.execute(refreshFailure)
      await guard.execute(refreshFailure)
      await guard.execute(refreshFailure)
      await guard.execute(refreshFailure)
      await guard.execute(refreshFailure)

      expect(onExhausted).toHaveBeenCalledOnce()
    })
  })

  describe("thrown errors count as failures", () => {
    test("treats a thrown refreshFn as a failed attempt", async () => {
      const onExhausted = vi.fn()
      const guard = createAuthRetryGuard(onExhausted)

      await guard.execute(refreshThrow)
      await guard.execute(refreshThrow)
      await guard.execute(refreshThrow)

      expect(onExhausted).toHaveBeenCalledOnce()
    })

    test("does not propagate the error to the caller", async () => {
      const guard = createAuthRetryGuard(vi.fn())

      await expect(guard.execute(refreshThrow)).resolves.toBe(false)
    })
  })

  describe("onExhausted failure handling", () => {
    test("stays exhausted if onExhausted throws", async () => {
      const onExhausted = vi.fn(() => {
        throw new Error("sign-out failed")
      })
      const guard = createAuthRetryGuard(onExhausted)

      await guard.execute(refreshFailure)
      await guard.execute(refreshFailure)
      await guard.execute(refreshFailure)

      // Guard is still exhausted — short-circuits
      const refreshFn = vi.fn(refreshSuccess)
      expect(await guard.execute(refreshFn)).toBe(false)
      expect(refreshFn).not.toHaveBeenCalled()
    })

    test("does not propagate onExhausted error to caller", async () => {
      const guard = createAuthRetryGuard(() =>
        Promise.reject(new Error("sign-out failed"))
      )

      await guard.execute(refreshFailure)
      await guard.execute(refreshFailure)

      await expect(guard.execute(refreshFailure)).resolves.toBe(false)
    })
  })

  describe("reset()", () => {
    test("re-enables the guard after exhaustion", async () => {
      const onExhausted = vi.fn()
      const guard = createAuthRetryGuard(onExhausted)

      // Exhaust
      await guard.execute(refreshFailure)
      await guard.execute(refreshFailure)
      await guard.execute(refreshFailure)

      guard.reset()

      // Guard is usable again
      expect(await guard.execute(refreshSuccess)).toBe(true)
    })

    test("resets the failure counter", async () => {
      const onExhausted = vi.fn()
      const guard = createAuthRetryGuard(onExhausted)

      await guard.execute(refreshFailure)
      await guard.execute(refreshFailure)

      guard.reset()

      // Need 3 fresh failures to exhaust again
      await guard.execute(refreshFailure)
      await guard.execute(refreshFailure)
      expect(onExhausted).not.toHaveBeenCalled()

      await guard.execute(refreshFailure)
      expect(onExhausted).toHaveBeenCalledOnce()
    })

    test("is a no-op while onExhausted is in-flight", async () => {
      let resolveExhausted!: () => void
      const exhaustedPromise = new Promise<void>((resolve) => {
        resolveExhausted = resolve
      })
      const onExhausted = vi.fn(() => exhaustedPromise)
      const guard = createAuthRetryGuard(onExhausted)

      await guard.execute(refreshFailure)
      await guard.execute(refreshFailure)

      // Start the 3rd failure — onExhausted is now in-flight.
      // Don't await: we want to call reset() while it's still pending.
      const thirdCall = guard.execute(refreshFailure)

      // Flush microtasks so execute() progresses past `await refreshFn()`
      // and sets exhaustionPromise before we call reset().
      await Promise.resolve()

      // reset() while onExhausted hasn't resolved yet — should be a no-op
      guard.reset()

      // Guard should still be exhausted
      const refreshFn = vi.fn(refreshSuccess)
      expect(await guard.execute(refreshFn)).toBe(false)
      expect(refreshFn).not.toHaveBeenCalled()

      // Let onExhausted finish
      resolveExhausted()
      await thirdCall

      // Now reset() should work
      guard.reset()
      expect(await guard.execute(refreshSuccess)).toBe(true)
    })
  })
})
