import { TextDecoder } from "util"
import { decodeB64StringToArrayBuffer } from "../b64"

describe("decodeB64StringToArrayBuffer", () => {
  test("decodes content correctly", () => {
    const decoder = new TextDecoder("utf-8")
    expect(
      decoder.decode(
        decodeB64StringToArrayBuffer("aG9wcHNjb3RjaCBpcyBhd2Vzb21lIQ==")
      )
    ).toMatch("hoppscotch is awesome!")
  })

  // TODO : More tests for binary data ?
})
