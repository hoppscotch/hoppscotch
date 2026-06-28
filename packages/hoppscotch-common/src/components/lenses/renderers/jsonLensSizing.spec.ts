import { describe, expect, it } from "vitest"

import { HoppRESTRequestResponse } from "@hoppscotch/data"

import {
  HoppRESTResponse,
  HoppRESTSuccessResponse,
} from "~/helpers/types/HoppRESTResponse"
import {
  JSON_OUTLINE_MAX_BYTES,
  JSON_PRETTIFY_MAX_BYTES,
  responseBodySizeBytes,
} from "./jsonLensSizing"

// A live success response carrying an authoritative `meta.responseSize`. Pass
// `responseSize: 0` to model a chunked-transfer response that omits
// `Content-Length` (the kernel reports no total size).
const liveResponse = (responseSize: number): HoppRESTSuccessResponse =>
  ({
    type: "success",
    headers: [{ key: "content-type", value: "application/json" }],
    body: new ArrayBuffer(0),
    statusCode: 200,
    statusText: "OK",
    meta: { responseSize, responseDuration: 1 },
    req: {} as HoppRESTSuccessResponse["req"],
  }) satisfies HoppRESTResponse

// A saved collection response — `HoppRESTRequestResponse` has no `meta`.
const savedResponse = (): HoppRESTRequestResponse =>
  ({
    name: "saved",
    body: "",
    headers: [],
    statusCode: 200,
  }) as unknown as HoppRESTRequestResponse

const bodyOf = (bytes: number) => "a".repeat(bytes)

describe("responseBodySizeBytes", () => {
  describe("non-chunked live responses (authoritative meta.responseSize)", () => {
    it("uses meta.responseSize and ignores body text length", () => {
      // Authoritative size wins even when the decoded text differs (e.g. body
      // not yet streamed, or multi-byte chars make bytes != chars).
      expect(responseBodySizeBytes(liveResponse(5_000_000), "")).toBe(5_000_000)
      expect(responseBodySizeBytes(liveResponse(42), bodyOf(10))).toBe(42)
    })

    it("classifies a large non-chunked response as over both caps", () => {
      const size = responseBodySizeBytes(liveResponse(3 * 1024 * 1024), "")
      expect(size).toBeGreaterThan(JSON_PRETTIFY_MAX_BYTES)
      expect(size).toBeGreaterThan(JSON_OUTLINE_MAX_BYTES)
    })

    it("classifies a small non-chunked response as under both caps", () => {
      const size = responseBodySizeBytes(liveResponse(1024), bodyOf(9_999_999))
      expect(size).toBeLessThan(JSON_OUTLINE_MAX_BYTES)
      expect(size).toBeLessThan(JSON_PRETTIFY_MAX_BYTES)
    })
  })

  describe("chunked live responses (meta.responseSize === 0)", () => {
    it("falls back to decoded body length instead of bypassing the caps", () => {
      // Regression: previously returned 0 here, so the caps never fired.
      const big = bodyOf(3 * 1024 * 1024)
      const size = responseBodySizeBytes(liveResponse(0), big)
      expect(size).toBe(big.length)
      expect(size).toBeGreaterThan(JSON_PRETTIFY_MAX_BYTES)
      expect(size).toBeGreaterThan(JSON_OUTLINE_MAX_BYTES)
    })

    it("still classifies a small chunked response as under both caps", () => {
      const size = responseBodySizeBytes(liveResponse(0), bodyOf(2048))
      expect(size).toBe(2048)
      expect(size).toBeLessThan(JSON_OUTLINE_MAX_BYTES)
      expect(size).toBeLessThan(JSON_PRETTIFY_MAX_BYTES)
    })

    it("suppresses only the outline for a mid-size chunked response", () => {
      // Between the outline (512 KB) and prettify (2 MB) thresholds.
      const size = responseBodySizeBytes(liveResponse(0), bodyOf(1024 * 1024))
      expect(size).toBeGreaterThan(JSON_OUTLINE_MAX_BYTES)
      expect(size).toBeLessThan(JSON_PRETTIFY_MAX_BYTES)
    })
  })

  describe("saved collection responses (no meta)", () => {
    it("falls back to decoded body length", () => {
      const big = bodyOf(3 * 1024 * 1024)
      const size = responseBodySizeBytes(savedResponse(), big)
      expect(size).toBe(big.length)
      expect(size).toBeGreaterThan(JSON_PRETTIFY_MAX_BYTES)
    })
  })

  it("treats an empty body as zero (not large)", () => {
    expect(responseBodySizeBytes(liveResponse(0), "")).toBe(0)
    expect(responseBodySizeBytes(savedResponse(), "")).toBe(0)
  })
})
