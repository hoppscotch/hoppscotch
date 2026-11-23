import { describe, expect, it } from "vitest"
import { isValidJSONC, prettifyJSONCWithValidation } from "../jsoncPretty"
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

  it.each([
    [
      '{"id":1,"tags":["a","b"]}',
      '{\n  "id": 1,\n  "tags": [\n    "a",\n    "b"\n  ]\n}\n',
    ],
    ["[1,2]", "[\n  1,\n  2\n]\n"],
    ["null", "null\n"],
    ["42", "42\n"],
    ['"hello"', '"hello"\n'],
  ])("formats plain JSON: %s", (body, expected) => {
    expect(prettifyJSONCWithValidation(body)).toBe(expected)
  })

  it.each(['{"id":1}', "[1,2]", "null", '{"a":/* c */1,}'])(
    "isValidJSONC accepts: %s",
    (body) => {
      expect(isValidJSONC(body)).toBe(true)
    }
  )

  it.each(['{"id":}', '{"id":1', "", "not json"])(
    "isValidJSONC rejects: %s",
    (body) => {
      expect(isValidJSONC(body)).toBe(false)
    }
  )

  it.each(["42", "null", '"hello"', "true", "// note\n42"])(
    "linter accepts valid scalar body: %s",
    async (body) => {
      expect(await jsoncLinter(body)).toEqual([])
    }
  )

  it.each(["{", "[1,", "42 43", "/* unfinished", "nope"])(
    "linter still reports invalid body: %s",
    async (body) => {
      expect(await jsoncLinter(body)).not.toEqual([])
    }
  )

  it("still reports syntax errors in annotated bodies", async () => {
    expect(await jsoncLinter('{\n// Identifier\n"id":\n}')).not.toEqual([])
  })
})
