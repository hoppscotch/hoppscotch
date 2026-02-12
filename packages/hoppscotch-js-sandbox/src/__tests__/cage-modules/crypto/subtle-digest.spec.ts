import { describe, expect, test } from "vitest"
import { runTestWithEmptyEnv } from "~/utils/test-helpers"

// Pre-compute test data outside the sandbox
const helloWorldBytes = Array.from(new TextEncoder().encode("Hello, World!"))
const testBytes = Array.from(new TextEncoder().encode("test"))
const emptyBytes: number[] = []
const consistentDataBytes = Array.from(
  new TextEncoder().encode("consistent data")
)
const data1Bytes = Array.from(new TextEncoder().encode("data1"))
const data2Bytes = Array.from(new TextEncoder().encode("data2"))

describe("crypto.subtle.digest()", () => {
  test("should compute SHA-256 hash of string data", () => {
    const script = `
      const dataArray = ${JSON.stringify(helloWorldBytes)}

      const hashBuffer = await crypto.subtle.digest("SHA-256", dataArray)

      // Convert to hex string for verification
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

      // Expected SHA-256 hash of "Hello, World!"
      const expectedHash = "dffd6021bb2bd5b0af676290809ec3a53191dd81c7f70a4b28688a362182986f"

      hopp.test("SHA-256 digest is correct", () => {
        hopp.expect(hashHex).toBe(expectedHash)
        hopp.expect(hashBuffer.byteLength).toBe(32) // SHA-256 produces 32 bytes
      })
    `

    return expect(runTestWithEmptyEnv(script)()).resolves.toEqualRight([
      expect.objectContaining({
        children: expect.arrayContaining([
          expect.objectContaining({
            descriptor: "SHA-256 digest is correct",
            expectResults: expect.arrayContaining([
              expect.objectContaining({ status: "pass" }),
            ]),
          }),
        ]),
      }),
    ])
  })

  test("should compute SHA-1 hash", () => {
    const script = `
      const dataArray = ${JSON.stringify(testBytes)}

      const hashBuffer = await crypto.subtle.digest("SHA-1", dataArray)

      // Expected SHA-1 hash of "test"
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
      const expectedHash = "a94a8fe5ccb19ba61c4c0873d391e987982fbbd3"

      hopp.test("SHA-1 digest is correct", () => {
        hopp.expect(hashHex).toBe(expectedHash)
        hopp.expect(hashBuffer.byteLength).toBe(20) // SHA-1 produces 20 bytes
      })
    `

    return expect(runTestWithEmptyEnv(script)()).resolves.toEqualRight([
      expect.objectContaining({
        children: expect.arrayContaining([
          expect.objectContaining({
            descriptor: "SHA-1 digest is correct",
            expectResults: expect.arrayContaining([
              expect.objectContaining({ status: "pass" }),
            ]),
          }),
        ]),
      }),
    ])
  })

  test("should compute SHA-384 hash", () => {
    const script = `
      const dataArray = ${JSON.stringify(testBytes)}

      const hashBuffer = await crypto.subtle.digest("SHA-384", dataArray)

      hopp.test("SHA-384 produces correct byte length", () => {
        hopp.expect(hashBuffer.byteLength).toBe(48) // SHA-384 produces 48 bytes
      })
    `

    return expect(runTestWithEmptyEnv(script)()).resolves.toEqualRight([
      expect.objectContaining({
        children: expect.arrayContaining([
          expect.objectContaining({
            descriptor: "SHA-384 produces correct byte length",
            expectResults: [expect.objectContaining({ status: "pass" })],
          }),
        ]),
      }),
    ])
  })

  test("should compute SHA-512 hash", () => {
    const script = `
      const dataArray = ${JSON.stringify(testBytes)}

      const hashBuffer = await crypto.subtle.digest("SHA-512", dataArray)

      hopp.test("SHA-512 produces correct byte length", () => {
        hopp.expect(hashBuffer.byteLength).toBe(64) // SHA-512 produces 64 bytes
      })
    `

    return expect(runTestWithEmptyEnv(script)()).resolves.toEqualRight([
      expect.objectContaining({
        children: expect.arrayContaining([
          expect.objectContaining({
            descriptor: "SHA-512 produces correct byte length",
            expectResults: [expect.objectContaining({ status: "pass" })],
          }),
        ]),
      }),
    ])
  })

  test("should handle empty string", () => {
    const script = `
      const dataArray = ${JSON.stringify(emptyBytes)}

      const hashBuffer = await crypto.subtle.digest("SHA-256", dataArray)

      // SHA-256 of empty string
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
      const expectedHash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"

      hopp.test("Empty string digest is correct", () => {
        hopp.expect(hashHex).toBe(expectedHash)
      })
    `

    return expect(runTestWithEmptyEnv(script)()).resolves.toEqualRight([
      expect.objectContaining({
        children: expect.arrayContaining([
          expect.objectContaining({
            descriptor: "Empty string digest is correct",
            expectResults: [expect.objectContaining({ status: "pass" })],
          }),
        ]),
      }),
    ])
  })

  test("should produce consistent hashes for same input", () => {
    const script = `
      const dataArray = ${JSON.stringify(consistentDataBytes)}

      const hash1 = await crypto.subtle.digest("SHA-256", dataArray)
      const hash2 = await crypto.subtle.digest("SHA-256", dataArray)

      const hash1Hex = Array.from(new Uint8Array(hash1)).map(b => b.toString(16).padStart(2, '0')).join('')
      const hash2Hex = Array.from(new Uint8Array(hash2)).map(b => b.toString(16).padStart(2, '0')).join('')

      hopp.test("Same input produces same hash", () => {
        hopp.expect(hash1Hex).toBe(hash2Hex)
      })
    `

    return expect(runTestWithEmptyEnv(script)()).resolves.toEqualRight([
      expect.objectContaining({
        children: expect.arrayContaining([
          expect.objectContaining({
            descriptor: "Same input produces same hash",
            expectResults: [expect.objectContaining({ status: "pass" })],
          }),
        ]),
      }),
    ])
  })

  test("should produce different hashes for different inputs", () => {
    const script = `
      const data1Array = ${JSON.stringify(data1Bytes)}
      const data2Array = ${JSON.stringify(data2Bytes)}

      const hash1 = await crypto.subtle.digest("SHA-256", data1Array)
      const hash2 = await crypto.subtle.digest("SHA-256", data2Array)

      const hash1Hex = Array.from(new Uint8Array(hash1)).map(b => b.toString(16).padStart(2, '0')).join('')
      const hash2Hex = Array.from(new Uint8Array(hash2)).map(b => b.toString(16).padStart(2, '0')).join('')

      hopp.test("Different inputs produce different hashes", () => {
        hopp.expect(hash1Hex).not.toBe(hash2Hex)
      })
    `

    return expect(runTestWithEmptyEnv(script)()).resolves.toEqualRight([
      expect.objectContaining({
        children: expect.arrayContaining([
          expect.objectContaining({
            descriptor: "Different inputs produce different hashes",
            expectResults: [expect.objectContaining({ status: "pass" })],
          }),
        ]),
      }),
    ])
  })
})
