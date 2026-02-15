import { describe, expect, it } from "vitest"
import { parseCurlToGQL } from "./index"

describe("parseCurlToGQL", () => {
  it("parses standard JSON GraphQL body", () => {
    const curl = `curl "https://example.com/graphql" -H "content-type: application/json" --data-raw '{"query":"query Test { viewer { id } }","variables":{"id":"1"}}'`
    const result = parseCurlToGQL(curl)

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
    const curl = `curl "https://example.com/graphql" --data-raw '{"query":{"op":"invalid"}}'`
    const result = parseCurlToGQL(curl)

    expect(result.status).toBe("error")
  })

  it("parses GraphQL cURL with headers", () => {
    const curl = `curl "https://example.com/graphql" -H "Authorization: Bearer token123" -H "X-Custom: custom-value" --data-raw '{"query":"query { ping }"}'`
    const result = parseCurlToGQL(curl)

    expect(result.status).toBe("ok")
    if (result.status === "ok") {
      expect(result.data.url).toBe("https://example.com/graphql")
      expect(result.data.query).toBe("query { ping }")
      expect(result.data.headers).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            key: "Authorization",
            value: "Bearer token123",
            active: true,
          }),
          expect.objectContaining({
            key: "X-Custom",
            value: "custom-value",
            active: true,
          }),
        ])
      )
    }
  })

  it("handles empty body gracefully", () => {
    const result = parseCurlToGQL('curl "https://example.com/graphql"')

    expect(result.status).toBe("ok")
    if (result.status === "ok") {
      expect(result.data.query).toBe("")
      expect(result.data.variables).toBe("{}")
    }
  })

  it("parses GraphQL cURL with variables in JSON body", () => {
    const curl = `curl "https://example.com/graphql" --data-raw '{"query":"query($id:ID!){node(id:$id){id}}","variables":{"id":"test-id"}}'`
    const result = parseCurlToGQL(curl)

    expect(result.status).toBe("ok")
    if (result.status === "ok") {
      expect(result.data.variables).toContain('"id": "test-id"')
    }
  })
})
