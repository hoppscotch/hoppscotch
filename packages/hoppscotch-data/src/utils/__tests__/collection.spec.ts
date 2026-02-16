import { describe, expect, test } from "vitest"
import { generateUniqueRefId } from "../collection"

describe("collection utilities", () => {
  describe("generateUniqueRefId", () => {
    test("generates a non-empty string", () => {
      const id = generateUniqueRefId()
      expect(id).toBeTruthy()
      expect(typeof id).toBe("string")
    })

    test("generates unique IDs on successive calls", () => {
      const ids = new Set(Array.from({ length: 100 }, () => generateUniqueRefId()))
      expect(ids.size).toBe(100)
    })

    test("includes the provided prefix", () => {
      const id = generateUniqueRefId("test")
      expect(id.startsWith("test_")).toBe(true)
    })

    test("uses empty prefix by default", () => {
      const id = generateUniqueRefId()
      expect(id.startsWith("_")).toBe(true)
    })

    test("includes a timestamp component (base36)", () => {
      const id = generateUniqueRefId("pfx")
      const parts = id.split("_")
      // parts[0] = prefix, parts[1] = timestamp (base36), rest = uuid parts
      expect(parts.length).toBeGreaterThanOrEqual(3)
      // timestamp part should be parseable as base36
      const timestampPart = parts[1]
      expect(Number.isNaN(parseInt(timestampPart, 36))).toBe(false)
    })

    test("contains a UUID-like component with hyphens", () => {
      const id = generateUniqueRefId("pfx")
      // UUID v4 has format xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      // After the prefix and timestamp, we should have UUID parts
      const uuidPart = id.substring(id.indexOf("_", id.indexOf("_") + 1) + 1)
      expect(uuidPart).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
      )
    })
  })
})
