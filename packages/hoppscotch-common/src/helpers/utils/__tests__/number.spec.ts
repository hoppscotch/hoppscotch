import { describe, expect, test } from "vitest"
import { isNumeric } from "../number"

describe("isNumeric", () => {
  test("returns true for integers", () => {
    expect(isNumeric(0)).toBe(true)
    expect(isNumeric(42)).toBe(true)
    expect(isNumeric(-1)).toBe(true)
  })

  test("returns true for floating point numbers", () => {
    expect(isNumeric(3.14)).toBe(true)
    expect(isNumeric(-0.5)).toBe(true)
  })

  test("returns true for numeric strings", () => {
    expect(isNumeric("0")).toBe(true)
    expect(isNumeric("42")).toBe(true)
    expect(isNumeric("-1")).toBe(true)
    expect(isNumeric("3.14")).toBe(true)
    expect(isNumeric(" 42 ")).toBe(true)
  })

  test("returns true for Infinity values", () => {
    expect(isNumeric(Infinity)).toBe(true)
    expect(isNumeric(-Infinity)).toBe(true)
    expect(isNumeric("Infinity")).toBe(true)
  })

  test("returns false for NaN", () => {
    expect(isNumeric(NaN)).toBe(false)
  })

  test("returns false for empty and whitespace strings", () => {
    expect(isNumeric("")).toBe(false)
    expect(isNumeric(" ")).toBe(false)
    expect(isNumeric("  ")).toBe(false)
  })

  test("returns false for non-numeric strings", () => {
    expect(isNumeric("abc")).toBe(false)
    expect(isNumeric("12abc")).toBe(false)
  })

  test("returns false for non-string non-number types", () => {
    expect(isNumeric(null)).toBe(false)
    expect(isNumeric(undefined)).toBe(false)
    expect(isNumeric(true)).toBe(false)
    expect(isNumeric({})).toBe(false)
    expect(isNumeric([])).toBe(false)
  })
})
