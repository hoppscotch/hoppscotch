import type { Assertion, AsymmetricMatchersContaining } from "vitest"

interface CustomMatchers<R = any> {
  toBeLeft(expected: unknown): R
  toBeRight(): R
  toEqualLeft(expected: unknown): R
  toSubsetEqualRight(expected: unknown): R
}

declare module 'vitest' {
  interface Assertion<T = any> extends CustomMatchers<T> {}
  interface AsymmetricMatchersContaining extends CustomMatchers {}
}
