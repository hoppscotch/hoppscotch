import { describe, expect, it } from "vitest"
import { getDefaultRESTRequest } from "~/helpers/rest/default"
import { applyToolCall } from "../commands"

const withBody = (body: string, contentType = "application/json") => ({
  ...getDefaultRESTRequest(),
  body: { contentType, body },
})

describe("set_body", () => {
  it("serializes an object body instead of keeping the old one", () => {
    const req = withBody('{"old":true}') as never
    const res = applyToolCall(req, "set_body", {
      body: { name: "new" },
      contentType: "application/json",
    })

    expect(res.changed).toBe(true)
    expect(JSON.parse((req as { body: { body: string } }).body.body)).toEqual({
      name: "new",
    })
  })

  it("sends an object body as JSON when no content type is given", () => {
    const req = withBody("plain", "text/plain") as never
    applyToolCall(req, "set_body", { body: [1, 2] })

    expect((req as { body: unknown }).body).toEqual({
      contentType: "application/json",
      body: "[\n  1,\n  2\n]",
    })
  })

  // A JSON:API server answers 415 to plain application/json.
  it.each([
    "application/vnd.api+json",
    "application/hal+json",
    "application/ld+json",
  ])("keeps the request's %s for an object body", (type) => {
    const req = withBody("{}", type) as never
    applyToolCall(req, "set_body", { body: { data: { id: "1" } } })

    expect((req as { body: { contentType: string } }).body.contentType).toBe(
      type
    )
  })

  it("refuses an object body for a text content type", () => {
    const req = withBody("keep") as never
    const res = applyToolCall(req, "set_body", {
      body: { a: 1 },
      contentType: "text/plain",
    })

    expect(res.changed).toBe(false)
    expect(res.reply).toMatch(/^⚠️/)
    expect((req as { body: { body: string } }).body.body).toBe("keep")
  })

  it("still changes only the content type when no body is sent", () => {
    const req = withBody("<a/>", "text/plain") as never
    const res = applyToolCall(req, "set_body", { contentType: "text/xml" })

    expect(res.changed).toBe(true)
    expect((req as { body: unknown }).body).toEqual({
      contentType: "text/xml",
      body: "<a/>",
    })
  })
})
