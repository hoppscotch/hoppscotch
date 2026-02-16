import { describe, expect, test } from "vitest"
import { StatusCodes, getStatusCodeReasonPhrase } from "../statusCodes"

describe("StatusCodes", () => {
  describe("StatusCodes map", () => {
    test("contains all standard 1xx informational codes", () => {
      expect(StatusCodes[100]).toBe("Continue")
      expect(StatusCodes[101]).toBe("Switching Protocols")
      expect(StatusCodes[102]).toBe("Processing")
    })

    test("contains all standard 2xx success codes", () => {
      expect(StatusCodes[200]).toBe("OK")
      expect(StatusCodes[201]).toBe("Created")
      expect(StatusCodes[202]).toBe("Accepted")
      expect(StatusCodes[204]).toBe("No Content")
      expect(StatusCodes[206]).toBe("Partial Content")
    })

    test("contains all standard 3xx redirection codes", () => {
      expect(StatusCodes[301]).toBe("Moved Permanently")
      expect(StatusCodes[302]).toBe("Found")
      expect(StatusCodes[304]).toBe("Not Modified")
      expect(StatusCodes[307]).toBe("Temporary Redirect")
      expect(StatusCodes[308]).toBe("Permanent Redirect")
    })

    test("contains all standard 4xx client error codes", () => {
      expect(StatusCodes[400]).toBe("Bad Request")
      expect(StatusCodes[401]).toBe("Unauthorized")
      expect(StatusCodes[403]).toBe("Forbidden")
      expect(StatusCodes[404]).toBe("Not Found")
      expect(StatusCodes[405]).toBe("Method Not Allowed")
      expect(StatusCodes[408]).toBe("Request Timeout")
      expect(StatusCodes[409]).toBe("Conflict")
      expect(StatusCodes[429]).toBe("Too Many Requests")
    })

    test("contains all standard 5xx server error codes", () => {
      expect(StatusCodes[500]).toBe("Internal Server Error")
      expect(StatusCodes[501]).toBe("Not Implemented")
      expect(StatusCodes[502]).toBe("Bad Gateway")
      expect(StatusCodes[503]).toBe("Service Unavailable")
      expect(StatusCodes[504]).toBe("Gateway Timeout")
    })

    test("contains novelty and extended codes", () => {
      expect(StatusCodes[418]).toBe("I'm a teapot")
      expect(StatusCodes[451]).toBe("Unavailable For Legal Reasons")
    })

    test("returns undefined for non-existent codes", () => {
      expect(StatusCodes[999]).toBeUndefined()
      expect(StatusCodes[0]).toBeUndefined()
    })
  })

  describe("getStatusCodeReasonPhrase", () => {
    test("returns known status text for standard codes", () => {
      expect(getStatusCodeReasonPhrase(200)).toBe("OK")
      expect(getStatusCodeReasonPhrase(404)).toBe("Not Found")
      expect(getStatusCodeReasonPhrase(500)).toBe("Internal Server Error")
    })

    test("returns 'Unknown' for unrecognized status codes", () => {
      expect(getStatusCodeReasonPhrase(999)).toBe("Unknown")
      expect(getStatusCodeReasonPhrase(0)).toBe("Unknown")
      expect(getStatusCodeReasonPhrase(-1)).toBe("Unknown")
    })

    test("prefers provided statusText over known codes", () => {
      expect(getStatusCodeReasonPhrase(200, "Custom OK")).toBe("Custom OK")
      expect(getStatusCodeReasonPhrase(404, "My Not Found")).toBe(
        "My Not Found"
      )
    })

    test("truncates long statusText with ellipsis at 35 characters", () => {
      const longText = "A".repeat(50)
      const result = getStatusCodeReasonPhrase(200, longText)
      expect(result).toBe("A".repeat(35) + "...")
      expect(result.length).toBe(38) // 35 + "..."
    })

    test("does not truncate statusText at exactly 35 characters", () => {
      const exactText = "A".repeat(35)
      expect(getStatusCodeReasonPhrase(200, exactText)).toBe(exactText)
    })

    test("ignores empty statusText and falls back to known codes", () => {
      expect(getStatusCodeReasonPhrase(200, "")).toBe("OK")
      expect(getStatusCodeReasonPhrase(200, "   ")).toBe("OK")
    })

    test("ignores undefined statusText and falls back to known codes", () => {
      expect(getStatusCodeReasonPhrase(200, undefined)).toBe("OK")
    })

    test("trims whitespace from statusText before checking", () => {
      expect(getStatusCodeReasonPhrase(200, "  Custom  ")).toBe("Custom")
    })
  })
})
