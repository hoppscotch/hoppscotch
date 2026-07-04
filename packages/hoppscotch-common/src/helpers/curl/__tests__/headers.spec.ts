import { describe, expect, it } from "vitest"

import { parseCurlCommand } from "../curlparser"

// Regression tests for https://github.com/hoppscotch/hoppscotch/issues/6400
// A header value that itself contains ": " was silently dropped because the old
// parser split on every occurrence of ": " and then rejected arrays with > 2 elements.
describe("cURL header parsing", () => {
  it("imports a header whose value contains ': ' (colon + space)", () => {
    const result = parseCurlCommand(
      `curl https://example.com -H "X-Note: hello: world" -H "Accept: application/json"`
    )

    const xNote = result.headers.find((h) => h.key === "X-Note")
    const accept = result.headers.find((h) => h.key === "Accept")

    expect(xNote).toBeDefined()
    expect(xNote?.value).toBe("hello: world")
    expect(accept).toBeDefined()
    expect(accept?.value).toBe("application/json")
  })

  it("imports a header whose value has a colon without trailing space", () => {
    const result = parseCurlCommand(
      `curl https://example.com -H "X-Time: 12:30"`
    )

    const xTime = result.headers.find((h) => h.key === "X-Time")

    expect(xTime).toBeDefined()
    expect(xTime?.value).toBe("12:30")
  })

  it("imports a header with no space after the colon (compact form)", () => {
    const result = parseCurlCommand(
      `curl https://example.com -H "Authorization:Bearer token123"`
    )

    const auth = result.headers.find((h) => h.key === "Authorization")

    expect(auth).toBeDefined()
    expect(auth?.value).toBe("Bearer token123")
  })

  it("imports multiple headers with colon-containing values", () => {
    const result = parseCurlCommand(
      `curl https://example.com -H "X-A: foo: bar" -H "X-B: baz: qux: quux"`
    )

    const a = result.headers.find((h) => h.key === "X-A")
    const b = result.headers.find((h) => h.key === "X-B")

    expect(a?.value).toBe("foo: bar")
    expect(b?.value).toBe("baz: qux: quux")
  })
})
