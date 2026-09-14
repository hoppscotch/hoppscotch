import type { RelayCapabilities } from "@hoppscotch/kernel"
import { describe, expect, it } from "vitest"
import { supportsGRPC } from "../capabilities"

const capabilities = (
  content: string[],
  advanced: string[]
): RelayCapabilities =>
  ({
    content: new Set(content),
    advanced: new Set(advanced),
  }) as RelayCapabilities

describe("gRPC interceptor capabilities", () => {
  it("requires both binary content and HTTP/2", () => {
    expect(supportsGRPC(capabilities(["binary"], ["http2"]))).toBe(true)
    expect(supportsGRPC(capabilities(["binary"], []))).toBe(false)
    expect(supportsGRPC(capabilities([], ["http2"]))).toBe(false)
    expect(supportsGRPC(undefined)).toBe(false)
  })
})
