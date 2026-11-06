import { describe, expect, it } from "vitest"
import { findRequestByIdentity } from "./requestIdentity"

describe("request creation reconciliation", () => {
  it.each(["subscription-first", "response-first"])(
    "keeps one entry when creation is %s",
    (order) => {
      const pending = {
        _ref_id: "local-a",
        id: undefined as string | undefined,
        name: "edited locally",
      }
      const requests = [pending]
      const echo = { _ref_id: "local-a", id: "server-a", name: "original" }
      const response = () => {
        pending.id = echo.id
      }
      const subscription = () => {
        const existing = findRequestByIdentity(requests, echo)
        if (existing) existing.id = echo.id
        else requests.push(echo)
      }
      if (order === "response-first") response()
      subscription()
      response()
      subscription()
      expect(requests).toEqual([
        { _ref_id: "local-a", id: "server-a", name: "edited locally" },
      ])
    }
  )

  it("matches concurrent saves independently even with identical names", () => {
    const first = { _ref_id: "first", name: "Untitled" }
    const second = { _ref_id: "second", name: "Untitled" }
    expect(findRequestByIdentity([first, second], { _ref_id: "first" })).toBe(
      first
    )
    expect(findRequestByIdentity([first, second], { _ref_id: "second" })).toBe(
      second
    )
    expect(
      findRequestByIdentity([first, second], { _ref_id: "other" })
    ).toBeUndefined()
  })

  it("matches server IDs and legacy object identities without matching missing IDs", () => {
    const legacy = {}
    const saved = { id: "server" }
    expect(findRequestByIdentity([legacy, saved], { id: "server" })).toBe(saved)
    expect(findRequestByIdentity([legacy], legacy)).toBe(legacy)
    expect(findRequestByIdentity([legacy], {})).toBeUndefined()
  })
})
