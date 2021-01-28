import { isJSONContentType } from "../contenttypes"

describe("isJSONContentType", () => {
  test("returns true for JSON content types", () => {
    expect(isJSONContentType("application/json")).toBe(true)
    expect(isJSONContentType("application/vnd.api+json")).toBe(true)
    expect(isJSONContentType("application/hal+json")).toBe(true)
    expect(isJSONContentType("application/ld+json")).toBe(true)
  })

  test("returns true for JSON types with charset specified", () => {
    expect(isJSONContentType("application/json; charset=utf-8")).toBe(true)
    expect(isJSONContentType("application/vnd.api+json; charset=utf-8")).toBe(true)
    expect(isJSONContentType("application/hal+json; charset=utf-8")).toBe(true)
    expect(isJSONContentType("application/ld+json; charset=utf-8")).toBe(true)
  })

  test("returns false for non-JSON content types", () => {
    expect(isJSONContentType("application/xml")).toBe(false)
    expect(isJSONContentType("text/html")).toBe(false)
    expect(isJSONContentType("application/x-www-form-urlencoded")).toBe(false)
    expect(isJSONContentType("foo/jsoninword")).toBe(false)
  })

  test("returns false for non-JSON content types with charset", () => {
    expect(isJSONContentType("application/xml; charset=utf-8")).toBe(false)
    expect(isJSONContentType("text/html; charset=utf-8")).toBe(false)
    expect(isJSONContentType("application/x-www-form-urlencoded; charset=utf-8")).toBe(false)
    expect(isJSONContentType("foo/jsoninword; charset=utf-8")).toBe(false)
  })

  test("returns false for null/undefined", () => {
    expect(isJSONContentType(null)).toBe(false)
    expect(isJSONContentType(undefined)).toBe(false)
  })
})
