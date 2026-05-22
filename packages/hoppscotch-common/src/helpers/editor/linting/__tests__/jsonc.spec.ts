import { describe, expect, it } from "vitest"
import { stripComments } from "../jsonc"

describe("stripComments (JSONC to JSON conversion with float precision preservation)", () => {
  it("should preserve float numbers with .0 ending", () => {
    const jsonc = `
      {
        "price": 70.0,
        "nested": {
          "value": 100.00
        }
      }
    `
    const result = stripComments(jsonc)
    expect(result).toBe('{"price":70.0,"nested":{"value":100.00}}')
  })

  it("should remove comments and preserve float precision", () => {
    const jsonc = `
      {
        // This is a comment
        "price": 70.0, /* another comment */
        "count": 5
      }
    `
    const result = stripComments(jsonc)
    expect(result).toBe('{"price":70.0,"count":5}')
  })

  it("should preserve negative floats and scientific notation", () => {
    const jsonc = `
      {
        "negative": -5.0,
        "positive": 12.0,
        "scientific": 1.2e-5,
        "exponent": 10e+2
      }
    `
    const result = stripComments(jsonc)
    expect(result).toBe('{"negative":-5.0,"positive":12.0,"scientific":1.2e-5,"exponent":10e+2}')
  })

  it("should correctly handle trailing commas and comments", () => {
    const jsonc = `
      {
        "a": 1.0,
        "b": "text", // comment
      }
    `
    const result = stripComments(jsonc)
    expect(result).toBe('{"a":1.0,"b":"text"}')
  })
})
