import { describe, expect, test } from "vitest"
import { decodeB64StringToArrayBuffer } from "../b64"

const decode = (input) =>
  Array.from(new Uint8Array(decodeB64StringToArrayBuffer(input)))
const bytesOf = (str) => Array.from(Buffer.from(str, "utf-8"))

describe("decodeB64StringToArrayBuffer", () => {
  test("decodes content correctly", () => {
    expect(decode("aG9wcHNjb3RjaCBpcyBhd2Vzb21lIQ==")).toEqual(
      bytesOf("hoppscotch is awesome!")
    )
  })

  test("does not append zero bytes for padded input", () => {
    expect(decode("QQ==")).toEqual([65])
    expect(decode("QUI=")).toEqual([65, 66])
    expect(decode("QUJD")).toEqual([65, 66, 67])
    expect(decode("SGVsbG8=")).toEqual(bytesOf("Hello"))
    expect(decode("SGVsbG8gV29ybGQ=")).toEqual(bytesOf("Hello World"))
  })

  test("returns an empty buffer for empty input", () => {
    expect(decodeB64StringToArrayBuffer("").byteLength).toBe(0)
  })

  test("round-trips binary data of every length", () => {
    for (let len = 0; len <= 64; len++) {
      const data = Array.from({ length: len }, (_, i) => (i * 37 + len) % 256)
      const encoded = Buffer.from(data).toString("base64")
      expect(decode(encoded)).toEqual(data)
    }
  })

  test("ignores characters outside the base64 alphabet", () => {
    expect(decode("SGVs\nbG8=")).toEqual(bytesOf("Hello"))
  })
})
