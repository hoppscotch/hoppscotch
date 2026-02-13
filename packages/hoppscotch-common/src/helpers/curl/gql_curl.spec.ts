import { describe, expect, it } from "vitest"
import { parseCurlToGQL } from "./index"

describe("parseCurlToGQL", () => {
  it("parses standard JSON GraphQL body", () => {
    const result = parseCurlToGQL(
      'curl \'https://example.com/graphql\' -H \'content-type: application/json\' --data-raw \'{"query":"query Test { viewer { id } }","variables":{"id":"1"}}\''
    )

    expect(result.status).toBe("ok")

    if (result.status === "ok") {
      expect(result.data.url).toBe("https://example.com/graphql")
      expect(result.data.query).toBe("query Test { viewer { id } }")
      expect(result.data.variables).toBe(`{
  "id": "1"
}`)
    }
  })

  it("falls back to raw body for plain text input", () => {
    const result = parseCurlToGQL(
      "curl 'https://example.com/graphql' --data-raw 'query Plain { ping }'"
    )

    expect(result.status).toBe("ok")

    if (result.status === "ok") {
      expect(result.data.url).toBe("https://example.com/graphql")
      expect(result.data.query).toBe("query Plain { ping }")
      expect(result.data.variables).toBe("{}")
    }
  })

  it("handles malformed cURL string safely", () => {
    const result = parseCurlToGQL("this-is-not-a-valid-curl-command")

    expect(result.status).toBe("error")
  })

  it("returns error when GraphQL query is not a string", () => {
    const result = parseCurlToGQL(
      'curl "https://example.com/graphql" --data-raw \'{"query":{"op":"invalid"}}\''
    )

    expect(result.status).toBe("error")
  })
})
