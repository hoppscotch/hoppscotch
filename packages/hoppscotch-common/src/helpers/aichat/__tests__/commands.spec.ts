import { describe, expect, it } from "vitest"
import { parseRawKeyValueEntries } from "@hoppscotch/data"
import { getDefaultRESTRequest } from "~/helpers/rest/default"
import { applyToolCall, runChatCommand, toRawKeyValueLines } from "../commands"

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

describe("toRawKeyValueLines", () => {
  it("escapes decoded values the raw parser would split", () => {
    const lines = toRawKeyValueLines("note=line1%0Aline2&a%3Ab=1&plain=x")

    expect(parseRawKeyValueEntries(lines)).toEqual([
      { key: "note", value: "line1\nline2", active: true },
      { key: "a:b", value: "1", active: true },
      { key: "plain", value: "x", active: true },
    ])
  })

  it("keeps simple pairs readable", () => {
    expect(toRawKeyValueLines("a=1&b=two+words")).toBe("a: 1\nb: two words")
  })
})

describe("runChatCommand rename", () => {
  const req = () => ({
    ...getDefaultRESTRequest(),
    headers: [{ key: "X-Old", value: "v", active: true, description: "" }],
  })

  it.each([
    "rename header X-Old to X-New",
    "set the name of header X-Old to X-New",
    "rename the collection to Auth",
    "rename param page to p",
  ])("leaves the request alone for %s", (text) => {
    const r = req()
    const res = runChatCommand(r, text)

    expect(res.handled).toBe(false)
    expect(r.name).toBe("Untitled")
    expect(r.headers).toEqual(req().headers)
  })

  it.each([
    ["rename the request to Get users", "Get users"],
    ["rename to Login", "Login"],
    ["rename it to `List items`", "List items"],
    ["set the request name to Delete user", "Delete user"],
    ["change the name of this request to Fetch", "Fetch"],
    ["set the name to Search", "Search"],
  ])("renames the request for %s", (text, name) => {
    const r = req()
    const res = runChatCommand(r, text)

    expect(res.changed).toBe(true)
    expect(r.name).toBe(name)
    expect(r.method).toBe("GET")
  })
})

describe("runChatCommand method", () => {
  it("sets the URL without reading a verb out of it", () => {
    const r = getDefaultRESTRequest()
    runChatCommand(
      r,
      "set the request url to https://api.example.com/delete-item"
    )

    expect(r.method).toBe("GET")
    expect(r.endpoint).toBe("https://api.example.com/delete-item")
  })

  it.each([
    ["set method to post", "POST"],
    ["change the HTTP method to PUT", "PUT"],
    ["use the DELETE method", "DELETE"],
    ["make the request a PATCH", "PATCH"],
    ["make it a POST request", "POST"],
    ["switch to HEAD", "HEAD"],
    ["set request to POST", "POST"],
    ["change request to PUT", "PUT"],
    ["use POST for this request", "POST"],
  ])("sets the method for %s", (text, method) => {
    const r = getDefaultRESTRequest()
    const res = runChatCommand(r, text)

    expect(res.changed).toBe(true)
    expect(r.method).toBe(method)
  })

  it("does not read a method from a header edit", () => {
    const r = getDefaultRESTRequest()
    runChatCommand(r, "set header X-HTTP-Method-Override: PUT")

    expect(r.method).toBe("GET")
    expect(r.headers).toEqual([
      {
        key: "X-HTTP-Method-Override",
        value: "PUT",
        active: true,
        description: "",
      },
    ])
  })

  it("reports an unchanged method as no change", () => {
    const r = getDefaultRESTRequest()

    expect(runChatCommand(r, "set method to GET").changed).toBe(false)
  })
})

describe("set_method", () => {
  it("reports no change when the method already matches", () => {
    const r = getDefaultRESTRequest()

    expect(applyToolCall(r, "set_method", { method: "get" }).changed).toBe(
      false
    )
    expect(applyToolCall(r, "set_method", { method: "POST" }).changed).toBe(
      true
    )
    expect(r.method).toBe("POST")
  })
})
