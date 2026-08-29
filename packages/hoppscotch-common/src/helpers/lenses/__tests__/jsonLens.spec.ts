import { describe, expect, test, vi } from "vitest"
import jsonLens, { isValidJSONResponse } from "../jsonLens"
import { getSuitableLenses } from "../lenses"
import {
  JSON_FORMATTED_PREVIEW_LIMIT_BYTES,
  getResponseBodyByteLength,
  isBodyTooLargeForJsonPreview,
} from "../responseBodySize"
import { HoppRESTResponse } from "~/helpers/types/HoppRESTResponse"
import { HoppRESTRequest } from "@hoppscotch/data"

const successResponse = (
  contentType: string,
  body: ArrayBuffer
): HoppRESTResponse => ({
  type: "success",
  headers: [{ key: "Content-Type", value: contentType }],
  body,
  statusCode: 200,
  statusText: "OK",
  meta: {
    responseSize: body.byteLength,
    responseDuration: 1,
  },
  req: { name: "test" } as HoppRESTRequest,
})

const encode = (value: string) => {
  const bytes = new TextEncoder().encode(value)
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength
  )
}

describe("getResponseBodyByteLength", () => {
  test("returns 0 for an empty string", () => {
    expect(getResponseBodyByteLength("")).toBe(0)
  })

  test("returns ArrayBuffer.byteLength without decoding", () => {
    const body = new ArrayBuffer(128)
    expect(getResponseBodyByteLength(body)).toBe(128)
  })

  test("counts UTF-8 bytes for a string", () => {
    expect(getResponseBodyByteLength('{"ok":true}')).toBe(11)
  })
})

describe("isBodyTooLargeForJsonPreview", () => {
  test("empty string is not too large", () => {
    expect(isBodyTooLargeForJsonPreview("")).toBe(false)
  })

  test("null/undefined is not too large", () => {
    expect(isBodyTooLargeForJsonPreview(null)).toBe(false)
    expect(isBodyTooLargeForJsonPreview(undefined)).toBe(false)
  })

  test("small JSON stays under the threshold", () => {
    expect(isBodyTooLargeForJsonPreview('{"ok":true}')).toBe(false)
    expect(isBodyTooLargeForJsonPreview(encode('{"ok":true}'))).toBe(false)
  })

  test("body at the threshold is still formatted", () => {
    expect(
      isBodyTooLargeForJsonPreview(
        new ArrayBuffer(JSON_FORMATTED_PREVIEW_LIMIT_BYTES)
      )
    ).toBe(false)
  })

  test("body over the threshold uses large-response mode", () => {
    expect(
      isBodyTooLargeForJsonPreview(
        new ArrayBuffer(JSON_FORMATTED_PREVIEW_LIMIT_BYTES + 1)
      )
    ).toBe(true)
  })
})

describe("isValidJSONResponse", () => {
  test("accepts small JSON strings and ArrayBuffers", () => {
    expect(isValidJSONResponse('{"ok":true}')).toBe(true)
    expect(isValidJSONResponse("[1, 2, 3]")).toBe(true)
    expect(isValidJSONResponse(encode('{"ok":true}'))).toBe(true)
  })

  test("rejects empty responses", () => {
    expect(isValidJSONResponse("")).toBe(false)
    expect(isValidJSONResponse("   ")).toBe(false)
    expect(isValidJSONResponse(new ArrayBuffer(0))).toBe(false)
  })

  test("rejects invalid JSON", () => {
    expect(isValidJSONResponse("{")).toBe(false)
    expect(isValidJSONResponse("not json")).toBe(false)
  })

  test("does not JSON.parse oversized bodies", () => {
    const parseSpy = vi.spyOn(JSON, "parse")
    const decodeSpy = vi.spyOn(TextDecoder.prototype, "decode")

    expect(
      isValidJSONResponse(
        new ArrayBuffer(JSON_FORMATTED_PREVIEW_LIMIT_BYTES + 1)
      )
    ).toBe(false)

    expect(parseSpy).not.toHaveBeenCalled()
    expect(decodeSpy).not.toHaveBeenCalled()

    parseSpy.mockRestore()
    decodeSpy.mockRestore()
  })

  test("does not JSON.parse oversized invalid JSON strings", () => {
    const parseSpy = vi.spyOn(JSON, "parse")
    const hugeInvalid = "x".repeat(JSON_FORMATTED_PREVIEW_LIMIT_BYTES + 1)

    expect(isValidJSONResponse(hugeInvalid)).toBe(false)
    expect(parseSpy).not.toHaveBeenCalled()

    parseSpy.mockRestore()
  })
})

describe("getSuitableLenses", () => {
  test("keeps the JSON lens for application/json even when oversized", () => {
    const parseSpy = vi.spyOn(JSON, "parse")
    const lenses = getSuitableLenses(
      successResponse(
        "application/json",
        new ArrayBuffer(JSON_FORMATTED_PREVIEW_LIMIT_BYTES + 1)
      )
    )

    expect(lenses.map((lens) => lens.renderer)).toContain(jsonLens.renderer)
    expect(parseSpy).not.toHaveBeenCalled()
    parseSpy.mockRestore()
  })

  test("does not sniff JSON in oversized text/plain bodies", () => {
    const parseSpy = vi.spyOn(JSON, "parse")
    const lenses = getSuitableLenses(
      successResponse(
        "text/plain",
        new ArrayBuffer(JSON_FORMATTED_PREVIEW_LIMIT_BYTES + 1)
      )
    )

    expect(lenses.map((lens) => lens.renderer)).not.toContain(jsonLens.renderer)
    expect(parseSpy).not.toHaveBeenCalled()
    parseSpy.mockRestore()
  })

  test("still sniffs JSON in small text/plain bodies", () => {
    const lenses = getSuitableLenses(
      successResponse("text/plain", encode('{"ok":true}'))
    )

    expect(lenses.map((lens) => lens.renderer)).toContain(jsonLens.renderer)
  })
})
