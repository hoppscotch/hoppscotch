import { describe, expect, test } from "vitest"

import {
  decodeSubscriptionFrame,
  stringifySubscriptionErrorPayload,
} from "../connection"

describe("decodeSubscriptionFrame", () => {
  test("rejects non-string frames", () => {
    const result = decodeSubscriptionFrame(null as unknown as string)
    expect(result).toEqual({
      ok: false,
      reason: "Received an empty or non-string frame",
    })
  })

  test("rejects empty-string frames", () => {
    const result = decodeSubscriptionFrame("")
    expect(result).toEqual({
      ok: false,
      reason: "Received an empty or non-string frame",
    })
  })

  test("rejects frames that are not valid JSON", () => {
    const result = decodeSubscriptionFrame("not-json")
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason.length).toBeGreaterThan(0)
    }
  })

  test("rejects bare-string JSON with a non-object reason", () => {
    const result = decodeSubscriptionFrame('"a bare string"')
    expect(result).toEqual({
      ok: false,
      reason: "Subscription frame is not a valid object",
    })
  })

  test("rejects null JSON frames with a non-object reason", () => {
    const result = decodeSubscriptionFrame("null")
    expect(result).toEqual({
      ok: false,
      reason: "Subscription frame is not a valid object",
    })
  })

  test("rejects JSON arrays with a non-object reason", () => {
    const result = decodeSubscriptionFrame("[1,2,3]")
    expect(result).toEqual({
      ok: false,
      reason: "Subscription frame is not a valid object",
    })
  })

  test("rejects frames without a type field", () => {
    const result = decodeSubscriptionFrame(JSON.stringify({ id: "1" }))
    expect(result).toEqual({
      ok: false,
      reason: "Subscription frame is missing a type field",
    })
  })

  test("rejects frames where type is a non-string", () => {
    const result = decodeSubscriptionFrame(JSON.stringify({ type: 42 }))
    expect(result).toEqual({
      ok: false,
      reason: "Subscription frame is missing a type field",
    })
  })

  test("accepts a well-formed data frame", () => {
    const frame = {
      type: "data",
      id: "1",
      payload: { data: { hello: "world" } },
    }
    const result = decodeSubscriptionFrame(JSON.stringify(frame))
    expect(result).toEqual({ ok: true, frame })
  })

  test("accepts an error frame with a GraphQLError payload", () => {
    const frame = {
      type: "error",
      id: "1",
      payload: { message: "Unauthorized" },
    }
    const result = decodeSubscriptionFrame(JSON.stringify(frame))
    expect(result).toEqual({ ok: true, frame })
  })
})

describe("stringifySubscriptionErrorPayload", () => {
  test("returns strings unchanged", () => {
    expect(stringifySubscriptionErrorPayload("auth failed")).toBe("auth failed")
  })

  test("falls back to 'Unknown error' for null / undefined", () => {
    expect(stringifySubscriptionErrorPayload(null)).toBe("Unknown error")
    expect(stringifySubscriptionErrorPayload(undefined)).toBe("Unknown error")
  })

  test("serialises objects as JSON", () => {
    expect(
      stringifySubscriptionErrorPayload({ message: "bad subscription" })
    ).toBe('{"message":"bad subscription"}')
  })

  test("serialises GraphQLError-shaped payloads", () => {
    const payload = {
      message: "Variable $id is not defined",
      locations: [{ line: 2, column: 3 }],
    }
    const out = stringifySubscriptionErrorPayload(payload)
    expect(out).toContain("Variable $id is not defined")
    expect(out).toContain('"line":2')
  })

  test("falls back to 'Unknown error' when JSON.stringify throws", () => {
    const circular: Record<string, unknown> = {}
    circular.self = circular
    expect(stringifySubscriptionErrorPayload(circular)).toBe("Unknown error")
  })
})
