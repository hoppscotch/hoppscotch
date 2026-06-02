import { describe, expect, it } from "vitest"
import { coerceGlobalEnvironment } from "../globalEnvShape"

describe("coerceGlobalEnvironment", () => {
  it("passes through a valid v2 wrapper unchanged", () => {
    const wrapper = {
      v: 2 as const,
      variables: [
        { key: "k", initialValue: "i", currentValue: "c", secret: false },
      ],
    }

    expect(coerceGlobalEnvironment(wrapper)).toBe(wrapper)
  })

  it("wraps a bare variables array (legacy / older-backend shape)", () => {
    const bareArray = [
      { key: "k", initialValue: "i", currentValue: "c", secret: false },
    ]

    expect(coerceGlobalEnvironment(bareArray)).toEqual({
      v: 2,
      variables: bareArray,
    })
  })

  it("returns an empty wrapper for null", () => {
    expect(coerceGlobalEnvironment(null)).toEqual({ v: 2, variables: [] })
  })

  it("returns an empty wrapper for undefined", () => {
    expect(coerceGlobalEnvironment(undefined)).toEqual({ v: 2, variables: [] })
  })

  it("returns an empty wrapper for an object with non-array variables", () => {
    expect(
      coerceGlobalEnvironment({ v: 2, variables: "not-an-array" })
    ).toEqual({ v: 2, variables: [] })
  })

  it("returns an empty wrapper for an object missing variables", () => {
    expect(coerceGlobalEnvironment({ v: 2 })).toEqual({ v: 2, variables: [] })
  })

  it("rebuilds with v:2 when an object has a variables array but missing v", () => {
    const variables = [
      { key: "k", initialValue: "i", currentValue: "c", secret: false },
    ]
    expect(coerceGlobalEnvironment({ variables })).toEqual({
      v: 2,
      variables,
    })
  })

  it("rebuilds with v:2 when an object has a variables array but a non-2 v", () => {
    const variables = [
      { key: "k", initialValue: "i", currentValue: "c", secret: false },
    ]
    expect(coerceGlobalEnvironment({ v: 1, variables })).toEqual({
      v: 2,
      variables,
    })
    expect(coerceGlobalEnvironment({ v: "2", variables })).toEqual({
      v: 2,
      variables,
    })
  })

  it("returns an empty wrapper for a primitive", () => {
    expect(coerceGlobalEnvironment("string")).toEqual({
      v: 2,
      variables: [],
    })
    expect(coerceGlobalEnvironment(42)).toEqual({ v: 2, variables: [] })
  })

  it("preserves an empty variables array (does not collapse to a fresh wrapper)", () => {
    const wrapper = { v: 2 as const, variables: [] }
    // Identity check: when the input is already a valid wrapper we want
    // to pass it through, not re-allocate, so downstream `===` checks /
    // distinctUntilChanged comparisons stay stable.
    expect(coerceGlobalEnvironment(wrapper)).toBe(wrapper)
  })
})
