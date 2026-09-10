import { describe, expect, test } from "vitest"
import type { HoppCollection } from "@hoppscotch/data"
import { findCollectionByName } from "../collections"

const node = (
  name: string,
  folders: HoppCollection[] = [],
  requests: HoppCollection["requests"] = []
): HoppCollection =>
  ({
    v: 9,
    name,
    folders,
    requests,
    headers: [],
    auth: { authType: "inherit", authActive: true },
    variables: [],
  }) as unknown as HoppCollection

describe("findCollectionByName", () => {
  const tree = [
    node("Users", [node("Auth", [node("Tokens")]), node("Profiles")]),
    node("Orders", [node("Auth")]),
  ]

  test("prefers a top-level collection", () => {
    expect(findCollectionByName(tree, "orders")).toMatchObject({ path: "1" })
  })

  test("falls back to the shallowest nested folder by name", () => {
    expect(findCollectionByName(tree, "Auth")).toMatchObject({ path: "0/0" })
    expect(findCollectionByName(tree, "tokens")).toMatchObject({
      path: "0/0/0",
    })
  })

  test("returns null for unknown or empty names", () => {
    expect(findCollectionByName(tree, "Payments")).toBeNull()
    expect(findCollectionByName(tree, "  ")).toBeNull()
  })
})
