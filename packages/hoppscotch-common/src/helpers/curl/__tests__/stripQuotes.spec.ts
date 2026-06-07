import { describe, expect, test } from "vitest"
import { stripQuotes } from "../sub_helpers/body"

describe("stripQuotes", () => {

  test("removes surrounding double quotes from value", () => {
    expect(stripQuotes('"4"')).toBe("4")
  })

  test("removes double quotes from regular text values", () => {
    expect(stripQuotes('"hello"')).toBe("hello")
  })

  test("does not alter value without quotes", () => {
    expect(stripQuotes("4")).toBe("4")
  })

  test("does not alter value with only opening quote", () => {
    expect(stripQuotes('"hello')).toBe('"hello')
  })

  test("does not alter value with only closing quote", () => {
    expect(stripQuotes('hello"')).toBe('hello"')
  })

  test("does not alter empty string", () => {
    expect(stripQuotes("")).toBe("")
  })

})