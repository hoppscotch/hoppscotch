import { describe, expect, it } from "vitest"
import { prettifyJSONCWithValidation } from "../jsoncPretty"
import jsoncLinter from "../jsonc"

describe("prettifying annotated response bodies", () => {
  it("preserves line and block comments, trailing commas, and large numbers", async () => {
    const body = `{
// Unique user identifier
"id":9007199254740993,
"roles":[/* Allowed roles */"admin",],
"url":"https://example.com/a//b",
}`
    const formatted = prettifyJSONCWithValidation(body)

    expect(formatted).toContain("// Unique user identifier")
    expect(formatted).toContain("/* Allowed roles */")
    expect(formatted).toContain('"id": 9007199254740993')
    expect(formatted).toContain('"url": "https://example.com/a//b"')
    expect(formatted).toContain('"admin",')
    expect(prettifyJSONCWithValidation(formatted)).toBe(formatted)
    expect(await jsoncLinter(formatted)).toEqual([])
  })

  it.each(['{"id":}', '{"id":1', '{"id":/* unfinished}', ""])(
    "rejects malformed input instead of reporting successful formatting: %s",
    (body) => {
      expect(() => prettifyJSONCWithValidation(body)).toThrow(SyntaxError)
    }
  )

  it.each(['{"id":1}', "[1,2]", "null", "42", '"hello"'])(
    "still formats plain JSON: %s",
    (body) => {
      expect(JSON.parse(prettifyJSONCWithValidation(body))).toEqual(
        JSON.parse(body)
      )
    }
  )

  it("still reports syntax errors in annotated bodies", async () => {
    expect(await jsoncLinter('{\n// Identifier\n"id":\n}')).not.toEqual([])
  })
})
