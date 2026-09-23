import { describe, expect, it } from "vitest"
import { makeCollection, type HoppCollection } from "@hoppscotch/data"
import { buildSchema } from "graphql"
import { getDefaultRESTRequest } from "~/helpers/rest/default"
import {
  serializeCollections,
  serializeGQLSchema,
  truncateText,
} from "../context-serializers"

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

  const MORE = "…(truncated — more collections/requests exist)"

  it("stops at maxLines and says more exist", () => {
    const out = serializeCollections([folder("Root", [], 10)], 4)
    const lines = out.split("\n")

    expect(lines).toHaveLength(6)
    expect(lines.at(-2)).toBe("  - GET Root-req2")
    expect(lines.at(-1)).toBe(MORE)
  })

  it("stays within maxChars, the note included", () => {
    const out = serializeCollections([folder("Root", [], 50)], 80, 300)

    expect(out.length).toBeLessThanOrEqual(300)
    expect(out.endsWith(`\n${MORE}`)).toBe(true)
    expect(out).toContain("Root-req0")
  })
})

describe("serializeGQLSchema", () => {
  const fields = (prefix: string, n: number) =>
    Array.from({ length: n }, (_, i) => `  ${prefix}${i}(id: ID!): Thing`).join(
      "\n"
    )
  // Three roots each past rootBudget, plus types that never fit.
  const schema = buildSchema(`
    type Query {
${fields("findThingNumber", 100)}
    }
    type Mutation {
${fields("updateThingNumber", 100)}
    }
    type Subscription {
${fields("watchThingNumber", 100)}
    }
    type Thing { id: ID!, name: String }
    type Other { id: ID! }
  `)

  it("keeps three long roots and the note within the budget", () => {
    const out = serializeGQLSchema(schema)

    expect(out.length).toBeLessThanOrEqual(6000)
    expect(out).toContain("type Query {")
    expect(out).toContain("type Mutation {")
    expect(out).toContain("type Subscription {")
    expect(out.endsWith("…(schema truncated — more types exist)")).toBe(true)
  })

  it("holds a tight budget too", () => {
    for (const budget of [150, 400, 1000]) {
      expect(
        serializeGQLSchema(schema, budget, 200).length
      ).toBeLessThanOrEqual(budget)
    }
  })

  it("ships every type when they fit", () => {
    const small = buildSchema(
      "type Query { thing: Thing } type Thing { id: ID! }"
    )
    const out = serializeGQLSchema(small)

    expect(out).toContain("type Thing {")
    expect(out).not.toContain("truncated")
  })
})
