import { describe, expect, test } from "vitest"
import { normalizeGRPCRequestBodyWhitespace } from "../body"

describe("gRPC request body JSON", () => {
  test("normalizes non-breaking indentation", () => {
    const body =
      '{\n\u00a0 "title": "",\n\u00a0 "author": "",\n\u00a0 "isbn": ""\n}'

    expect(normalizeGRPCRequestBodyWhitespace(body)).toBe(
      '{\n  "title": "",\n  "author": "",\n  "isbn": ""\n}'
    )
  })

  test("preserves unicode whitespace inside JSON strings", () => {
    const body = '{"title":"A\u00a0B\u2028C\u2029D"}'

    expect(normalizeGRPCRequestBodyWhitespace(body)).toBe(body)
  })

  test("normalizes unicode line and paragraph separators outside strings", () => {
    const body = '{\u2028"title": "",\u2029"author": ""\u2028}'

    expect(normalizeGRPCRequestBodyWhitespace(body)).toBe(
      '{ "title": "", "author": "" }'
    )
  })
})
