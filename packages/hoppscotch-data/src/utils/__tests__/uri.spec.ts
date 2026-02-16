import { describe, expect, test } from "vitest"
import {
  safeParseURL,
  isValidURL,
  extractQueryParams,
  buildURLWithParams,
  joinURLPath,
} from "../uri"

describe("URI utilities", () => {
  describe("safeParseURL", () => {
    test("parses a fully qualified URL", () => {
      const result = safeParseURL("https://api.example.com:8080/v1/users?page=1#top")
      expect(result).not.toBeNull()
      expect(result!.protocol).toBe("https:")
      expect(result!.hostname).toBe("api.example.com")
      expect(result!.port).toBe("8080")
      expect(result!.pathname).toBe("/v1/users")
      expect(result!.search).toBe("?page=1")
      expect(result!.hash).toBe("#top")
    })

    test("prepends default protocol when missing", () => {
      const result = safeParseURL("example.com/api")
      expect(result).not.toBeNull()
      expect(result!.protocol).toBe("https:")
      expect(result!.hostname).toBe("example.com")
      expect(result!.pathname).toBe("/api")
    })

    test("uses custom default protocol", () => {
      const result = safeParseURL("example.com/api", "http://")
      expect(result).not.toBeNull()
      expect(result!.protocol).toBe("http:")
    })

    test("returns null for empty string", () => {
      expect(safeParseURL("")).toBeNull()
    })

    test("returns null for whitespace-only string", () => {
      expect(safeParseURL("   ")).toBeNull()
    })

    test("returns null for null-ish values", () => {
      expect(safeParseURL(null as any)).toBeNull()
      expect(safeParseURL(undefined as any)).toBeNull()
    })

    test("returns null for completely invalid URL", () => {
      expect(safeParseURL("://")).toBeNull()
    })

    test("handles localhost URLs", () => {
      const result = safeParseURL("http://localhost:3000/api")
      expect(result).not.toBeNull()
      expect(result!.hostname).toBe("localhost")
      expect(result!.port).toBe("3000")
    })

    test("handles IP address URLs", () => {
      const result = safeParseURL("http://192.168.1.1:9090/health")
      expect(result).not.toBeNull()
      expect(result!.hostname).toBe("192.168.1.1")
    })

    test("trims whitespace from input", () => {
      const result = safeParseURL("  https://example.com  ")
      expect(result).not.toBeNull()
      expect(result!.hostname).toBe("example.com")
    })
  })

  describe("isValidURL", () => {
    test("returns true for valid HTTP URL", () => {
      expect(isValidURL("https://example.com")).toBe(true)
      expect(isValidURL("http://localhost:3000")).toBe(true)
    })

    test("returns true for other valid schemes", () => {
      expect(isValidURL("ftp://files.example.com")).toBe(true)
    })

    test("returns false for strings without protocol", () => {
      expect(isValidURL("example.com")).toBe(false)
    })

    test("returns false for empty string", () => {
      expect(isValidURL("")).toBe(false)
    })

    test("returns false for random text", () => {
      expect(isValidURL("not a url at all")).toBe(false)
    })
  })

  describe("extractQueryParams", () => {
    test("extracts single query parameter", () => {
      const params = extractQueryParams("https://example.com?key=value")
      expect(params).toEqual([{ key: "key", value: "value" }])
    })

    test("extracts multiple query parameters", () => {
      const params = extractQueryParams(
        "https://example.com?a=1&b=2&c=3"
      )
      expect(params).toEqual([
        { key: "a", value: "1" },
        { key: "b", value: "2" },
        { key: "c", value: "3" },
      ])
    })

    test("handles URL-encoded values", () => {
      const params = extractQueryParams(
        "https://example.com?q=hello%20world&tag=a%26b"
      )
      expect(params).toEqual([
        { key: "q", value: "hello world" },
        { key: "tag", value: "a&b" },
      ])
    })

    test("returns empty array for URL without query params", () => {
      expect(extractQueryParams("https://example.com/path")).toEqual([])
    })

    test("returns empty array for invalid URL", () => {
      expect(extractQueryParams("not-a-url")).toEqual([])
    })

    test("handles duplicate keys", () => {
      const params = extractQueryParams(
        "https://example.com?a=1&a=2"
      )
      expect(params).toEqual([
        { key: "a", value: "1" },
        { key: "a", value: "2" },
      ])
    })

    test("handles empty value", () => {
      const params = extractQueryParams("https://example.com?key=")
      expect(params).toEqual([{ key: "key", value: "" }])
    })
  })

  describe("buildURLWithParams", () => {
    test("appends parameters to a URL", () => {
      const result = buildURLWithParams("https://example.com/api", [
        { key: "page", value: "1" },
        { key: "limit", value: "10" },
      ])
      expect(result).toContain("page=1")
      expect(result).toContain("limit=10")
    })

    test("preserves existing query parameters", () => {
      const result = buildURLWithParams("https://example.com?existing=true", [
        { key: "new", value: "param" },
      ])
      expect(result).toContain("existing=true")
      expect(result).toContain("new=param")
    })

    test("skips inactive parameters", () => {
      const result = buildURLWithParams("https://example.com", [
        { key: "active", value: "yes", active: true },
        { key: "inactive", value: "no", active: false },
      ])
      expect(result).toContain("active=yes")
      expect(result).not.toContain("inactive")
    })

    test("skips parameters with empty keys", () => {
      const result = buildURLWithParams("https://example.com", [
        { key: "", value: "orphan" },
        { key: "valid", value: "param" },
      ])
      expect(result).toContain("valid=param")
      expect(result).not.toContain("orphan")
    })

    test("returns original URL on parse failure", () => {
      const result = buildURLWithParams("not-a-url", [
        { key: "a", value: "1" },
      ])
      expect(result).toBe("not-a-url")
    })
  })

  describe("joinURLPath", () => {
    test("joins base and path with proper slashes", () => {
      expect(joinURLPath("https://api.example.com", "v1/users")).toBe(
        "https://api.example.com/v1/users"
      )
    })

    test("handles trailing slash on base", () => {
      expect(joinURLPath("https://api.example.com/", "v1/users")).toBe(
        "https://api.example.com/v1/users"
      )
    })

    test("handles leading slash on path", () => {
      expect(joinURLPath("https://api.example.com", "/v1/users")).toBe(
        "https://api.example.com/v1/users"
      )
    })

    test("handles both trailing and leading slashes", () => {
      expect(joinURLPath("https://api.example.com/", "/v1/users")).toBe(
        "https://api.example.com/v1/users"
      )
    })

    test("returns path when base is empty", () => {
      expect(joinURLPath("", "/v1/users")).toBe("/v1/users")
    })

    test("returns base when path is empty", () => {
      expect(joinURLPath("https://api.example.com", "")).toBe(
        "https://api.example.com"
      )
    })
  })
})
