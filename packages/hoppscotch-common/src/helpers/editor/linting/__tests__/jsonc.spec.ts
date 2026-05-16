import { describe, it, expect } from "vitest"
import { stripComments } from "../jsonc"

describe("jsonc helpers", () => {
  describe("stripComments", () => {
    it("preserves exact floating point precision like 70.0", () => {
      const input = `{"val": 70.0}`
      const result = stripComments(input)
      expect(result).toBe(`{"val":70.0}`)
    })

    it("preserves integers accurately", () => {
      const input = `{"val": 100}`
      const result = stripComments(input)
      expect(result).toBe(`{"val":100}`)
    })

    it("preserves floating points with multiple trailing zeros", () => {
      const input = `{"val": 1.050}`
      const result = stripComments(input)
      expect(result).toBe(`{"val":1.050}`)
    })

    it("preserves 0.0 accurately", () => {
      const input = `{"val": 0.0}`
      const result = stripComments(input)
      expect(result).toBe(`{"val":0.0}`)
    })

    it("preserves scientific notation accurately", () => {
      const input = `{"val": 1e3}`
      const result = stripComments(input)
      expect(result).toBe(`{"val":1e3}`)
    })

    it("safely strips comments while preserving nearby numbers", () => {
      const input = `{
        // The price
        "price": 70.0,
        /* The weight */
        "weight": 1.050
      }`
      const result = stripComments(input)
      expect(result).toBe(`{"price":70.0,"weight":1.050}`)
    })
  })
})
