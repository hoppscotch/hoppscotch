import { makeCollection } from "@hoppscotch/data"
import { beforeEach, describe, expect, test } from "vitest"

import {
  restCollectionStore,
  setRESTCollections,
  updateRESTCollectionOrder,
} from "../collections"

const collection = (
  name: string,
  folders: ReturnType<typeof makeCollection>[] = []
) =>
  makeCollection({
    name,
    folders,
    requests: [],
    auth: { authType: "inherit", authActive: true },
    headers: [],
    variables: [],
    id: name,
    description: null,
    preRequestScript: "",
    testScript: "",
  })

describe("REST collections store - updateCollectionOrder", () => {
  beforeEach(() => {
    setRESTCollections([
      collection("Root A", [collection("Nested A1"), collection("Nested A2")]),
      collection("Root B"),
      collection("Root C"),
    ])
  })

  test("reorders siblings within the same (root) parent", () => {
    updateRESTCollectionOrder("2", "0")

    const names = restCollectionStore.value.state.map((c) => c.name)
    expect(names).toEqual(["Root C", "Root A", "Root B"])
  })

  test("reorders siblings within the same nested parent", () => {
    updateRESTCollectionOrder("0/1", "0/0")

    const names = restCollectionStore.value.state[0].folders.map((c) => c.name)
    expect(names).toEqual(["Nested A2", "Nested A1"])
  })

  test("moves a nested collection to the end of root when destination is null", () => {
    updateRESTCollectionOrder("0/0", null)

    const root = restCollectionStore.value.state
    // it stays within its own parent (moved to the end of Root A's folders)
    expect(root[0].folders.map((c) => c.name)).toEqual([
      "Nested A2",
      "Nested A1",
    ])
  })

  test("moves a nested sub-collection into the top-level collection list (issue #6522)", () => {
    // Drag "Nested A1" (path 0/0) to sit at the position of "Root B" (path 1)
    updateRESTCollectionOrder("0/0", "1")

    const root = restCollectionStore.value.state

    // it must be removed from its original nested parent
    expect(root[0].folders.map((c) => c.name)).toEqual(["Nested A2"])

    // ...and re-inserted at the top level, not lost or duplicated
    const rootNames = root.map((c) => c.name)
    expect(rootNames).toContain("Nested A1")
    expect(rootNames).toHaveLength(4)

    // no other root collection should have been corrupted/duplicated
    expect(rootNames.filter((n) => n === "Root A")).toHaveLength(1)
    expect(rootNames.filter((n) => n === "Root B")).toHaveLength(1)
    expect(rootNames.filter((n) => n === "Root C")).toHaveLength(1)
  })
})
