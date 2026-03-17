import { describe, expect, it } from "vitest"
import { stripComments } from "../jsonc"

describe("jsonc helpers", () => {
  describe("stripComments", () => {
    it("should preserve numeric precision for large integers", () => {
      const input = `{ "largeNumber": 9007199254740993 }`
      const expected = `{"largeNumber":9007199254740993}`
      expect(stripComments(input)).toBe(expected)
    })

    it("should handle scientific notation correctly", () => {
      const input = `{ "sci": 1e308 }`
      const expected = `{"sci":1e308}`
      expect(stripComments(input)).toBe(expected)
    })

    it("should handle negative numbers and floats", () => {
      const input = `{
        "negative": -42,
        "float": 3.14159265359,
        "negativeFloat": -2.71828
      }`
      const expected = `{"negative":-42,"float":3.14159265359,"negativeFloat":-2.71828}`
      expect(stripComments(input)).toBe(expected)
    })

    it("should strip comments correctly", () => {
      const input = `{
        // This is a comment
        "value": 1, /* inline comment */
        "string": "hello // world"
      }`
      const expected = `{"value":1,"string":"hello // world"}`
      expect(stripComments(input)).toBe(expected)
    })

    it("should handle trailing commas", () => {
      const input = `{
        "a": 1,
        "b": 2,
      }`
      const expected = `{"a":1,"b":2}`
      expect(stripComments(input)).toBe(expected)
    })

    it("should handle complex nested structures", () => {
      const input = `{
        "array": [1, 2, { "nestedLarge": 99999999999999999 }],
        "object": { "a": -1.5 }
      }`
      const expected = `{"array":[1,2,{"nestedLarge":99999999999999999}],"object":{"a":-1.5}}`
      expect(stripComments(input)).toBe(expected)
    })
  })
})
