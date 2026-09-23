import { describe, expect, it } from "vitest"
import { makeCollection, type HoppCollection } from "@hoppscotch/data"
import { getDefaultRESTRequest } from "~/helpers/rest/default"
import { serializeCollections, truncateText } from "../context-serializers"

/** A lone surrogate makes the provider reject the whole request body. */
const LONE_SURROGATE =
  /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/

describe("truncateText", () => {
  it("never splits an emoji at the cut", () => {
    const text = `${"x".repeat(999)}\u{1F600}tail`
    const out = truncateText(text, 1000)

    expect(out).not.toMatch(LONE_SURROGATE)
    expect(out).toBe(`${"x".repeat(999)}…[truncated]`)
  })

  it("keeps text under the cap untouched", () => {
    expect(truncateText("\u{1F600}", 2)).toBe("\u{1F600}")
  })
})

describe("serializeCollections", () => {
  const folder = (
    name: string,
    folders: HoppCollection[] = [],
    requests = 0
  ): HoppCollection =>
    makeCollection({
      name,
      folders,
      requests: Array.from({ length: requests }, (_, i) => ({
        ...getDefaultRESTRequest(),
        name: `${name}-req${i}`,
      })),
      auth: { authType: "inherit", authActive: true },
      headers: [],
      variables: [],
    } as never)

  it("says when folders nest deeper than the outline shows", () => {
    const tree = [
      folder("Root", [
        folder("L1", [
          folder("L2", [folder("L3", [folder("L4-Deep", [], 1)])]),
        ]),
      ]),
    ]
    const out = serializeCollections(tree)

    expect(out).not.toContain("L4-Deep")
    expect(out).toContain("…1 more folder nested deeper")
  })

  it("adds no marker when nothing is hidden", () => {
    const out = serializeCollections([folder("Root", [folder("L1", [], 1)])])

    expect(out).not.toMatch(/nested deeper|truncated/)
  })
})
