import { HoppCollection } from "@hoppscotch/data"
import { describe, expect, test } from "vitest"
import { applyRunOrder, collectRequestIDs } from "../selection"

const request = (name: string) => ({ _ref_id: name, name }) as any

const collection = (
  name: string,
  requests: string[],
  folders: HoppCollection[] = []
) => ({ name, requests: requests.map(request), folders }) as any

const items = (...ids: string[]) => ids.map((id) => ({ id }))
const idsOf = (list: { id: string }[]) => list.map(({ id }) => id)
const order = (...ids: string[]) => new Map(ids.map((id, index) => [id, index]))

// `collectRequestIDs`, `RunnerRequestSelector.flatten` and `planCollection`
// flatten independently and must agree on the order: folders (depth-first)
// before a node's own requests.
describe("collectRequestIDs ordering contract", () => {
  test("descends into folders before a collection's own requests", () => {
    const tree = collection(
      "root",
      ["a", "b"],
      [
        collection("f1", ["c"], [collection("f1a", ["d"])]),
        collection("f2", ["e"]),
      ]
    )

    expect(collectRequestIDs(tree)).toEqual(["d", "c", "e", "a", "b"])
  })

  test("falls back to a positional id when a request has no _ref_id", () => {
    const tree = {
      name: "root",
      requests: [{ name: "no-ref" }],
      folders: [{ name: "f", requests: [{ name: "nested" }], folders: [] }],
    } as any

    expect(collectRequestIDs(tree)).toEqual(["path:0/0", "path:0"])
  })
})

describe("applyRunOrder", () => {
  test("runs requests in the sequence the user set", () => {
    const result = applyRunOrder(items("a", "b", "c"), order("c", "a", "b"))
    expect(idsOf(result)).toEqual(["c", "a", "b"])
  })

  test("keeps collection order when no sequence is set", () => {
    const result = applyRunOrder(items("a", "b", "c"), new Map())
    expect(idsOf(result)).toEqual(["a", "b", "c"])
  })

  test("appends requests the sequence does not mention, in collection order", () => {
    const result = applyRunOrder(items("a", "b", "c", "d"), order("c", "a"))
    expect(idsOf(result)).toEqual(["c", "a", "b", "d"])
  })

  test("ignores sequence entries whose request no longer exists", () => {
    const result = applyRunOrder(items("a", "b"), order("deleted", "b", "a"))
    expect(idsOf(result)).toEqual(["b", "a"])
  })

  test("is stable for items sharing a position", () => {
    const result = applyRunOrder(items("a", "b", "c"), new Map([["c", 0]]))
    expect(idsOf(result)).toEqual(["c", "a", "b"])
  })
})
