import { describe, expect, it } from "vitest"

import { stripComments } from "../jsonc"

describe("stripComments", () => {
  it("preserves the original representation of JSON numbers", () => {
    const input = `{
      "decimal": 70.0,
      "negativeZero": -0.0,
      "exponent": 1.0e+3
    }`

    expect(stripComments(input)).toBe(
      '{"decimal":70.0,"negativeZero":-0.0,"exponent":1.0e+3}'
    )
  })

  it("still removes comments and trailing commas", () => {
    const input = `{
      // Keep the decimal spelling while cleaning JSONC syntax.
      "value": 70.0,
    }`

    expect(stripComments(input)).toBe('{"value":70.0}')
  })
})
