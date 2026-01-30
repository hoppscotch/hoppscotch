import { describe, expect, test } from "vitest"
import { FaradayCage } from "faraday-cage"
import { customCryptoModule } from "~/cage-modules"
import { runTestWithEmptyEnv } from "~/utils/test-helpers"

describe("crypto.getRandomValues()", () => {
  test("should generate random values for array", () => {
    const script = `
      const array = new Array(10).fill(0)
      const result = crypto.getRandomValues(array)

      // Check that values were modified
      const hasNonZero = result.some(v => v !== 0)

      hopp.test("Random values generated", () => {
        hopp.expect(result.length).toBe(10)
        hopp.expect(hasNonZero).toBe(true)
        hopp.expect(result).toBe(array) // Should mutate in place
      })
    `

    return expect(runTestWithEmptyEnv(script)()).resolves.toEqualRight([
      expect.objectContaining({
        children: expect.arrayContaining([
          expect.objectContaining({
            descriptor: "Random values generated",
            expectResults: expect.arrayContaining([
              expect.objectContaining({ status: "pass" }),
            ]),
          }),
        ]),
      }),
    ])
  })

  test("should generate different values on multiple calls", () => {
    const script = `
      const array1 = new Array(32).fill(0)
      const array2 = new Array(32).fill(0)

      crypto.getRandomValues(array1)
      crypto.getRandomValues(array2)

      // Arrays should be different
      const isDifferent = array1.some((v, i) => v !== array2[i])

      hopp.test("Random values are different", () => {
        hopp.expect(isDifferent).toBe(true)
      })
    `

    return expect(runTestWithEmptyEnv(script)()).resolves.toEqualRight([
      expect.objectContaining({
        children: expect.arrayContaining([
          expect.objectContaining({
            descriptor: "Random values are different",
            expectResults: [expect.objectContaining({ status: "pass" })],
          }),
        ]),
      }),
    ])
  })

  test("should handle different array sizes", () => {
    const script = `
      const sizes = [1, 16, 256]
      const results = []

      for (const size of sizes) {
        const array = new Array(size).fill(0)
        crypto.getRandomValues(array)
        results.push({
          size,
          hasRandomValues: array.some(v => v !== 0),
          length: array.length
        })
      }

      hopp.test("Handles various array sizes", () => {
        for (const result of results) {
          hopp.expect(result.length).toBe(result.size)
          hopp.expect(result.hasRandomValues).toBe(true)
        }
      })
    `

    return expect(runTestWithEmptyEnv(script)()).resolves.toEqualRight([
      expect.objectContaining({
        children: expect.arrayContaining([
          expect.objectContaining({
            descriptor: "Handles various array sizes",
            expectResults: expect.arrayContaining([
              expect.objectContaining({ status: "pass" }),
            ]),
          }),
        ]),
      }),
    ])
  })

  test("should return values in valid byte range (0-255)", () => {
    const script = `
      const array = new Array(100).fill(0)
      crypto.getRandomValues(array)

      const allInRange = array.every(v => v >= 0 && v <= 255)
      const hasVariety = new Set(array).size > 1

      hopp.test("Values are valid bytes", () => {
        hopp.expect(allInRange).toBe(true)
        hopp.expect(hasVariety).toBe(true)
      })
    `

    return expect(runTestWithEmptyEnv(script)()).resolves.toEqualRight([
      expect.objectContaining({
        children: expect.arrayContaining([
          expect.objectContaining({
            descriptor: "Values are valid bytes",
            expectResults: expect.arrayContaining([
              expect.objectContaining({ status: "pass" }),
            ]),
          }),
        ]),
      }),
    ])
  })
})

describe("crypto.randomUUID()", () => {
  test("should generate valid UUID v4 format", () => {
    const script = `
      const uuid = crypto.randomUUID()

      // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

      hopp.test("UUID format is valid", () => {
        hopp.expect(typeof uuid).toBe("string")
        hopp.expect(uuid.length).toBe(36)
        hopp.expect(uuidPattern.test(uuid)).toBe(true)
      })
    `

    return expect(runTestWithEmptyEnv(script)()).resolves.toEqualRight([
      expect.objectContaining({
        children: expect.arrayContaining([
          expect.objectContaining({
            descriptor: "UUID format is valid",
            expectResults: expect.arrayContaining([
              expect.objectContaining({ status: "pass" }),
            ]),
          }),
        ]),
      }),
    ])
  })

  test("should generate unique UUIDs", () => {
    const script = `
      const uuids = []
      for (let i = 0; i < 100; i++) {
        uuids.push(crypto.randomUUID())
      }

      const uniqueUuids = new Set(uuids)

      hopp.test("UUIDs are unique", () => {
        hopp.expect(uniqueUuids.size).toBe(100)
      })
    `

    return expect(runTestWithEmptyEnv(script)()).resolves.toEqualRight([
      expect.objectContaining({
        children: expect.arrayContaining([
          expect.objectContaining({
            descriptor: "UUIDs are unique",
            expectResults: [expect.objectContaining({ status: "pass" })],
          }),
        ]),
      }),
    ])
  })

  test("should generate UUIDs with correct version and variant", () => {
    const script = `
      const uuid = crypto.randomUUID()
      const parts = uuid.split('-')

      // Version should be 4 (random)
      const version = parts[2][0]

      // Variant should be 8, 9, a, or b (RFC 4122)
      const variant = parts[3][0].toLowerCase()

      hopp.test("UUID version and variant are correct", () => {
        hopp.expect(version).toBe('4')
        hopp.expect(['8', '9', 'a', 'b'].includes(variant)).toBe(true)
      })
    `

    return expect(runTestWithEmptyEnv(script)()).resolves.toEqualRight([
      expect.objectContaining({
        children: expect.arrayContaining([
          expect.objectContaining({
            descriptor: "UUID version and variant are correct",
            expectResults: expect.arrayContaining([
              expect.objectContaining({ status: "pass" }),
            ]),
          }),
        ]),
      }),
    ])
  })

  test("should still work when cryptoImpl.randomUUID is missing (polyfill)", async () => {
    const cage = await FaradayCage.create()

    const cryptoImplWithoutRandomUUID = {
      getRandomValues: globalThis.crypto.getRandomValues.bind(
        globalThis.crypto
      ),
      subtle: globalThis.crypto.subtle,
    } as unknown as Crypto

    const script = `
      (async () => {
        const uuid = crypto.randomUUID()
        const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        if (typeof uuid !== 'string' || uuid.length !== 36) throw new Error('uuid shape invalid')
        if (!uuidPattern.test(uuid)) throw new Error('uuid format invalid')
      })()
    `

    const result = await cage.runCode(script, [
      customCryptoModule({
        cryptoImpl: cryptoImplWithoutRandomUUID,
      }),
    ])

    expect(result.type).toBe("ok")
  })
})
