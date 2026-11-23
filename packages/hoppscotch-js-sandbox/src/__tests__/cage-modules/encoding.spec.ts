import { describe, expect, test } from "vitest"
import { runTestWithEmptyEnv } from "~/utils/test-helpers"

const passed = (descriptor: string) =>
  expect.objectContaining({
    descriptor,
    expectResults: [expect.objectContaining({ status: "pass" })],
  })

describe("TextEncoder / TextDecoder", () => {
  test("TextEncoder.encode() returns bytes with a length", () => {
    const script = `
      const bytes = new TextEncoder().encode("héllo")

      hopp.test("length", () => {
        hopp.expect(bytes.length).toBe(6)
      })
      hopp.test("byteLength", () => {
        hopp.expect(bytes.byteLength).toBe(6)
      })
      hopp.test("Array.from keeps the bytes", () => {
        hopp.expect(Array.from(bytes).join(",")).toBe("104,195,169,108,108,111")
      })
    `

    return expect(runTestWithEmptyEnv(script)()).resolves.toEqualRight([
      expect.objectContaining({
        children: [
          passed("length"),
          passed("byteLength"),
          passed("Array.from keeps the bytes"),
        ],
      }),
    ])
  })

  // https://github.com/hoppscotch/hoppscotch/issues/6008
  test("SHA-256 of TextEncoder output matches the expected digest", () => {
    const script = `
      const data = new TextEncoder().encode("Hello, World!")
      const hashBuffer = await crypto.subtle.digest("SHA-256", data)
      const hashHex = Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")

      hopp.test("digest", () => {
        hopp.expect(hashHex).toBe(
          "dffd6021bb2bd5b0af676290809ec3a53191dd81c7f70a4b28688a362182986f"
        )
      })
    `

    return expect(runTestWithEmptyEnv(script)()).resolves.toEqualRight([
      expect.objectContaining({ children: [passed("digest")] }),
    ])
  })

  test("HMAC-SHA256 with an encoded key and message matches the expected signature", () => {
    const script = `
      const encoder = new TextEncoder()
      const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode("key"),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      )
      const signature = await crypto.subtle.sign(
        "HMAC",
        key,
        encoder.encode("The quick brown fox jumps over the lazy dog")
      )
      const signatureHex = Array.from(new Uint8Array(signature))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")

      hopp.test("signature", () => {
        hopp.expect(signatureHex).toBe(
          "f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8"
        )
      })
    `

    return expect(runTestWithEmptyEnv(script)()).resolves.toEqualRight([
      expect.objectContaining({ children: [passed("signature")] }),
    ])
  })

  test("TextDecoder decodes TextEncoder output", () => {
    const script = `
      const text = new TextDecoder().decode(new TextEncoder().encode("héllo 世界"))

      hopp.test("round trip", () => {
        hopp.expect(text).toBe("héllo 世界")
      })
    `

    return expect(runTestWithEmptyEnv(script)()).resolves.toEqualRight([
      expect.objectContaining({ children: [passed("round trip")] }),
    ])
  })
})
