import { describe, test, expect } from "vitest"
import { stripComments } from "../editor/linting/jsonc"

describe("stripComments — numeric precision", () => {
  test("preserves integer at MAX_SAFE_INTEGER boundary", () => {
    const input = `{"id": 9007199254740991}`
    expect(stripComments(input)).toBe('{"id":9007199254740991}')
  })

  test("preserves integer one above MAX_SAFE_INTEGER (the issue case)", () => {
    // 9007199254740993 = 2^53 + 1, which JS rounds to 9007199254740992
    const input = `{"id": 9007199254740993}`
    expect(stripComments(input)).toBe('{"id":9007199254740993}')
  })

  test("preserves very large integer (17 digits)", () => {
    const input = `{"snowflake": 99999999999999999}`
    expect(stripComments(input)).toBe('{"snowflake":99999999999999999}')
  })

  test("preserves large integer in an array", () => {
    const input = `{"ids": [9007199254740993, 9007199254740994]}`
    expect(stripComments(input)).toBe(
      '{"ids":[9007199254740993,9007199254740994]}'
    )
  })

  test("preserves large integer nested inside object", () => {
    const input = `{"outer": {"inner": 9007199254740993}}`
    expect(stripComments(input)).toBe('{"outer":{"inner":9007199254740993}}')
  })

  test("preserves large integer while stripping inline comment", () => {
    const input = `{
      "id": 9007199254740993 // user id
    }`
    expect(stripComments(input)).toBe('{"id":9007199254740993}')
  })

  test("preserves large integer while stripping trailing comma", () => {
    const input = `{"id": 9007199254740993,}`
    expect(stripComments(input)).toBe('{"id":9007199254740993}')
  })

  test("preserves large integer with both comment and trailing comma", () => {
    const input = `{
      // record ID
      "id": 9007199254740993,
    }`
    expect(stripComments(input)).toBe('{"id":9007199254740993}')
  })

  test("preserves negative large integer", () => {
    const input = `{"delta": -9007199254740993}`
    expect(stripComments(input)).toBe('{"delta":-9007199254740993}')
  })

  test("small integers still work correctly", () => {
    const input = `{"count": 42}`
    expect(stripComments(input)).toBe('{"count":42}')
  })

  test("preserves floating-point number verbatim", () => {
    const input = `{"ratio": 1.50}`
    expect(stripComments(input)).toBe('{"ratio":1.50}')
  })
})
