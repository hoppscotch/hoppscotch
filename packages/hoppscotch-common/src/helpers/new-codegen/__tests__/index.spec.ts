import { describe, it, expect } from "vitest"
import { makeRESTRequest } from "@hoppscotch/data"
import { getDefaultRESTRequest } from "~/helpers/rest/default"
import { generateCode, protectLargeIntegers } from "../index"
import * as O from "fp-ts/Option"

describe("new-codegen", () => {
  describe("protectLargeIntegers", () => {
    it("preserves large integers > Number.MAX_SAFE_INTEGER in JSON strings", () => {
      const json = JSON.stringify({
        largeInt: 9007199254740993n.toString(),
      }).replace('"9007199254740993"', "9007199254740993")

      const { processed, restore } = protectLargeIntegers(json)
      expect(processed).toContain("__HOPP_BIGINT_")
      const restored = restore(processed)
      expect(restored).toBe(json)
    })

    it("does not modify numbers within the safe integer range", () => {
      const json = JSON.stringify({ safeInt: 42, floatNum: 3.14 })
      const { processed } = protectLargeIntegers(json)
      expect(processed).toBe(json)
    })

    it("does not modify numbers inside string literals or keys", () => {
      const json = JSON.stringify({
        "9007199254740993": "value with 9007199254740993 inside",
      })
      const { processed } = protectLargeIntegers(json)
      expect(processed).toBe(json)
    })
  })

  describe("generateCode", () => {
    it("generates cURL without truncating 64-bit large integers in JSON body", () => {
      const req = makeRESTRequest({
        ...getDefaultRESTRequest(),
        method: "POST",
        endpoint: "https://example.com/api/test",
        headers: [
          {
            active: true,
            key: "Content-Type",
            value: "application/json",
            description: "",
          },
        ],
        body: {
          contentType: "application/json",
          body: JSON.stringify({
            id: 9007199254740993n.toString(),
            hugeId: 12345678901234567890n.toString(),
            nested: {
              val: 9007199254740995n.toString(),
            },
          })
            .replace('"9007199254740993"', "9007199254740993")
            .replace('"12345678901234567890"', "12345678901234567890")
            .replace('"9007199254740995"', "9007199254740995"),
        },
      })

      const curlResult = generateCode("shell-curl", req)
      expect(O.isSome(curlResult)).toBe(true)
      if (O.isSome(curlResult)) {
        expect(curlResult.value).toContain("9007199254740993")
        expect(curlResult.value).toContain("12345678901234567890")
        expect(curlResult.value).toContain("9007199254740995")
        expect(curlResult.value).not.toContain("9007199254740992")
      }

      const phpResult = generateCode("php-curl", req)
      expect(O.isSome(phpResult)).toBe(true)
      if (O.isSome(phpResult)) {
        expect(phpResult.value).toContain("9007199254740993")
        expect(phpResult.value).toContain("12345678901234567890")
        expect(phpResult.value).not.toContain("9007199254740992")
      }

      const jsResult = generateCode("javascript-fetch", req)
      expect(O.isSome(jsResult)).toBe(true)
      if (O.isSome(jsResult)) {
        expect(jsResult.value).toContain("9007199254740993")
        expect(jsResult.value).toContain("12345678901234567890")
        expect(jsResult.value).not.toContain("9007199254740992")
      }

      const pythonResult = generateCode("python-requests", req)
      expect(O.isSome(pythonResult)).toBe(true)
      if (O.isSome(pythonResult)) {
        expect(pythonResult.value).toContain("9007199254740993")
        expect(pythonResult.value).toContain("12345678901234567890")
        expect(pythonResult.value).not.toContain("9007199254740992")
      }
    })
  })
})
