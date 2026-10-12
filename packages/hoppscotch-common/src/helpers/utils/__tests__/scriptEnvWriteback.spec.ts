import { describe, expect, it } from "vitest"

import {
  nonSecretKeysOf,
  frozenInitialValueForWire,
} from "../scriptEnvWriteback"

describe("nonSecretKeysOf", () => {
  it("includes non-secret keys and excludes secret keys", () => {
    const keys = nonSecretKeysOf([
      { key: "host", secret: false },
      { key: "token", secret: true },
      { key: "region", secret: false },
    ])
    expect([...keys].sort()).toEqual(["host", "region"])
    expect(keys.has("token")).toBe(false)
  })

  it("treats a missing secret flag as non-secret", () => {
    expect(nonSecretKeysOf([{ key: "a" }]).has("a")).toBe(true)
  })

  it("dedupes duplicate keys to a single membership entry", () => {
    const keys = nonSecretKeysOf([
      { key: "x", secret: false },
      { key: "x", secret: false },
    ])
    expect(keys.size).toBe(1)
    expect(keys.has("x")).toBe(true)
  })
})

describe("frozenInitialValueForWire", () => {
  it("keeps a pre-existing non-secret var's own initialValue (default preserved)", () => {
    const existing = new Set(["host"])
    expect(
      frozenInitialValueForWire({ key: "host", initialValue: "prod" }, existing)
    ).toBe("prod")
  })

  it("blanks a key the script created this run (absent from the set)", () => {
    expect(
      frozenInitialValueForWire(
        { key: "created", initialValue: "runtime" },
        new Set()
      )
    ).toBe("")
  })

  it("blanks a key that was secret pre-run and got demoted (absent from the non-secret set)", () => {
    // e.g. pw.env.unset("host"); pw.env.set("host", "x") on a secret `host`.
    // `nonSecretKeysOf` excluded it, so it's treated as created → empty default.
    const existingNonSecret = nonSecretKeysOf([{ key: "host", secret: true }])
    expect(
      frozenInitialValueForWire(
        { key: "host", initialValue: "leaked" },
        existingNonSecret
      )
    ).toBe("")
  })

  it("gives duplicate keys their OWN initialValue (membership, not a value lookup)", () => {
    // The bug this guards against: a Map keyed by name collapsed duplicates
    // last-wins, pushing the wrong default to a shared team env.
    const existing = new Set(["x"])
    expect(
      frozenInitialValueForWire({ key: "x", initialValue: "A" }, existing)
    ).toBe("A")
    expect(
      frozenInitialValueForWire({ key: "x", initialValue: "B" }, existing)
    ).toBe("B")
  })

  it("treats a missing initialValue as empty", () => {
    expect(frozenInitialValueForWire({ key: "host" }, new Set(["host"]))).toBe(
      ""
    )
  })
})
