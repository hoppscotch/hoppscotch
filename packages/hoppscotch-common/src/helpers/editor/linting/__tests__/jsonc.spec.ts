import { describe, expect, test } from "vitest"
import { stripComments } from "../jsonc"

describe("stripComments", () => {
  test("removes comments and trailing commas", () => {
    expect(
      stripComments(`{
        // comment
        "a": 1, /* inline */
        "b": [true, null,],
      }`)
    ).toBe(`{"a":1,"b":[true,null]}`)
  })

  test("keeps trailing zeros in decimal numbers", () => {
    expect(
      stripComments(
        `{"latitude": 31.117385000000, "longitude": 121.380577000000}`
      )
    ).toBe(`{"latitude":31.117385000000,"longitude":121.380577000000}`)
  })

  test("keeps integers larger than Number.MAX_SAFE_INTEGER", () => {
    expect(stripComments(`{"id": 12345678901234567890}`)).toBe(
      `{"id":12345678901234567890}`
    )
  })

  test("keeps exponent and negative number literals as written", () => {
    expect(stripComments(`[1.0E+2, -0.50, 1e-7]`)).toBe(`[1.0E+2,-0.50,1e-7]`)
  })

  test("returns the input unchanged when it can't be parsed", () => {
    expect(stripComments(`not json`)).toBe(`not json`)
  })
})
