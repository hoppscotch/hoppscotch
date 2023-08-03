import { describe, expect, test } from "vitest"
import { decodeB64StringToArrayBuffer } from "../b64"

describe("decodeB64StringToArrayBuffer", () => {
  test("decodes content correctly", () => {
    expect(
      decodeB64StringToArrayBuffer("aG9wcHNjb3RjaCBpcyBhd2Vzb21lIQ==")
    ).toEqual(Buffer.from("hoppscotch is awesome!", "utf-8").buffer)
  })

  // TODO : More tests for binary data ?
})
