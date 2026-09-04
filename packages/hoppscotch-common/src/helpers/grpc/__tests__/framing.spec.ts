import { describe, expect, test } from "vitest"
import { frameGRPCMessage, parseGRPCResponse } from "../framing"

describe("gRPC framing", () => {
  test("frames an outbound protobuf message", () => {
    const frame = frameGRPCMessage(Uint8Array.from([1, 2, 3]))
    expect([...frame]).toEqual([0, 0, 0, 0, 3, 1, 2, 3])
  })

  test("parses data frames", () => {
    const parsed = parseGRPCResponse(frameGRPCMessage(Uint8Array.from([8, 1])))
    expect([...parsed.messages[0]]).toEqual([8, 1])
  })

  test("rejects incomplete frames", () => {
    expect(() => parseGRPCResponse(Uint8Array.from([0, 0, 0]))).toThrow(
      "Incomplete gRPC frame header"
    )
  })
})
