import { describe, expect, it } from "vitest"
import { parseAppActionCommand, splitCommands } from "../app-actions"

describe("set_interceptor", () => {
  it.each([
    ["select interceptor browser", "browser"],
    ["select interceptor proxy", "proxy"],
    ["switch interceptor native", "native"],
    ["set the interceptor to the browser", "browser"],
    ["select the proxy interceptor", "proxy"],
    ["use the extension agent", "extension"],
    ["switch to agent", "agent"],
    ["use proxy", "proxy"],
  ])("reads the interceptor from %s", (text, interceptor) => {
    expect(parseAppActionCommand(text)).toEqual({
      name: "set_interceptor",
      input: { interceptor },
    })
  })

  it.each([
    "set header User-Agent: foo",
    "set header Proxy-Authorization: Basic abc",
  ])("leaves the header edit %s alone", (text) => {
    expect(parseAppActionCommand(text)).toBeNull()
  })
})

describe("create_collection", () => {
  it.each([
    "create a collection for the auth flows",
    "create a collection with my requests",
    "make a new collection",
  ])("needs a name for %s", (text) => {
    expect(parseAppActionCommand(text)?.name).not.toBe("create_collection")
  })

  it.each([
    ["create a collection called Auth flows", "Auth flows"],
    ["create collection Users", "Users"],
    ["create a collection for login named Login", "Login"],
    ['create a collection "for the win"', "for the win"],
  ])("names the collection from %s", (text, name) => {
    expect(parseAppActionCommand(text)).toEqual({
      name: "create_collection",
      input: { name },
    })
  })
})

describe("splitCommands", () => {
  it("splits a tab action from the run", () => {
    expect(splitCommands("open a new tab and run the request")).toEqual([
      "open a new tab",
      "run the request",
    ])
  })
})
