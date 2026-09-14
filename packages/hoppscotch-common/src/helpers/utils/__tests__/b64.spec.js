import { describe, expect, test } from "vitest"
import { decodeB64StringToArrayBuffer } from "../b64"

describe("decodeB64StringToArrayBuffer", () => {
  const decodeAsBytes = (input) =>
    Array.from(new Uint8Array(decodeB64StringToArrayBuffer(input)))

  test("decodes content correctly", () => {
    expect(decodeAsBytes("aG9wcHNjb3RjaCBpcyBhd2Vzb21lIQ==")).toEqual(
      Array.from(Buffer.from("hoppscotch is awesome!", "utf-8"))
    )
  })

  test("does not include zero bytes for padded base64 strings", () => {
    expect(decodeAsBytes("YQ==")).toEqual([97])
    expect(decodeAsBytes("YWI=")).toEqual([97, 98])
  })

  test("decodes binary data", () => {
    const bytes = [0, 255, 16, 32, 128, 64, 7]
    const input = Buffer.from(bytes).toString("base64")

    expect(decodeAsBytes(input)).toEqual(bytes)
  })
})
