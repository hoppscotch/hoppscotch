import { describe, expect, it } from "vitest"
import * as E from "fp-ts/Either"

import { hoppGqlCollectionsImporter } from "../hoppGql"

describe("hoppGqlCollectionsImporter", () => {
  it("imports a valid Hoppscotch GQL collection", () => {
    const collection = {
      v: 12,
      name: "Test Collection",
      folders: [],
      requests: [],
      auth: {
        authType: "inherit",
        authActive: true,
      },
      headers: [],
      variables: [],
      description: null,
      preRequestScript: "",
      testScript: "",
    }

    const result = hoppGqlCollectionsImporter([JSON.stringify(collection)])

    expect(E.isRight(result)).toBe(true)
  })

  it("rejects invalid JSON", () => {
    const result = hoppGqlCollectionsImporter(["invalid json"])

    expect(result).toEqual(E.left("INVALID_JSON"))
  })

  it("rejects valid JSON that is not a Hoppscotch collection", () => {
    const result = hoppGqlCollectionsImporter([
      JSON.stringify({
        foo: "bar",
      }),
    ])

    expect(result).toEqual(E.left("INVALID_JSON"))
  })

  it("rejects an invalid collection structure", () => {
    const result = hoppGqlCollectionsImporter([
      JSON.stringify({
        v: 12,
        name: "Invalid Collection",
        folders: [],
        requests: "not-an-array",
      }),
    ])

    expect(result).toEqual(E.left("INVALID_JSON"))
  })
})
