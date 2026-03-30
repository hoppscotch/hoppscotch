import { FaradayCage } from "faraday-cage"

let cagePromise: Promise<FaradayCage> | null = null

const isTestEnvironment =
  typeof process !== "undefined" && process.env.VITEST === "true"

/**
 * Determines if an error indicates an infrastructure failure (not a user script error).
 *
 * FaradayCage/QuickJS errors arrive in two shapes:
 *
 * 1. **User script errors** — `cage.runCode()` returns `{ type: "error" }` where
 *    `result.err` is a plain object from QuickJS `dump()` (NOT `instanceof Error`).
 *
 * 2. **Infrastructure errors** — Thrown by host-side module setup (e.g.
 *    `QuickJSUnwrapError`, marshal failures, WASM init). These are real
 *    `Error` instances.
 *
 * `instanceof Error` reliably discriminates between the two.
 */
export const isInfraError = (err: unknown): boolean => err instanceof Error

export const resetCage = (): void => {
  cagePromise = null
}

/**
 * Returns a cached FaradayCage singleton (production) or a fresh instance (tests).
 *
 * In test environments, a fresh cage is created by default. Tests that need to
 * exercise the singleton/retry path can override this via `_setCagePromiseForTesting()`.
 */
export const acquireCage = async (): Promise<FaradayCage> => {
  if (isTestEnvironment) {
    if (cagePromise) {
      return cagePromise.catch((err) => {
        cagePromise = null
        throw err
      })
    }

    return FaradayCage.create()
  }

  if (!cagePromise) {
    cagePromise = FaradayCage.create().catch((err) => {
      cagePromise = null
      throw err
    })
  }

  return cagePromise
}

/**
 * Injects a cage promise into the singleton slot. Test-only — allows tests to
 * exercise the singleton/retry path that is normally skipped in test environments.
 */
export const _setCagePromiseForTesting = (
  promise: Promise<FaradayCage> | null
): void => {
  if (!isTestEnvironment) {
    throw new Error(
      "_setCagePromiseForTesting is test-only and cannot be used in non-test environments"
    )
  }
  cagePromise = promise
}
