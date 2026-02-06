import { describe, it, expect } from "vitest"
import { filterActiveToRecord } from "../functional/filter-active"

describe("filterActiveToRecord", () => {
  it("normalizes header keys to lowercase and resolves duplicates (manual wins)", () => {
    const input = [
      {
        key: "content-type",
        value: "application/json",
        active: true,
      },
      {
        key: "Content-Type",
        value: "text/plain",
        active: true,
      },
    ]

    const record = filterActiveToRecord(input as any)

    expect(record).toEqual({
      "content-type": "text/plain",
    })
  })

  it("ignores inactive headers", () => {
    const input = [
      {
        key: "Authorization",
        value: "Bearer token",
        active: false,
      },
    ]

    const record = filterActiveToRecord(input as any)

    expect(record).toEqual({})
  })
})
