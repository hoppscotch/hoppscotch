import {
  getSharedCookieMethods,
  getSharedRequestProps,
  preventCyclicObjects,
} from "~/utils/shared"

import { Cookie, HoppRESTRequest } from "@hoppscotch/data"
import { describe, expect, test } from "vitest"

describe("preventCyclicObjects", () => {
  test("succeeds with a simple object", () => {
    const testObj = {
      a: 1,
    }

    expect(preventCyclicObjects(testObj)).toBeRight()
  })

  test("fails with a cyclic object", () => {
    const testObj = {
      a: 1,
      b: null as any,
    }

    testObj.b = testObj

    expect(preventCyclicObjects(testObj)).toBeLeft()
  })
})

describe("getSharedRequestProps", () => {
  const baseRequest: HoppRESTRequest = {
    v: "15",
    name: "Test Request",
    endpoint: "https://example.com/api",
    method: "GET",
    headers: [{ key: "X-Test", value: "val1", active: true, description: "" }],
    params: [{ key: "q", value: "search", active: true, description: "" }],
    body: { contentType: null, body: null },
    auth: { authType: "none", authActive: false },
    preRequestScript: "",
    testScript: "",
    requestVariables: [],
    responses: {},
  }

  test("`url` getter", () => {
    const request = getSharedRequestProps(baseRequest)
    expect(request.url).toBe("https://example.com/api")
  })

  test("`method` getter", () => {
    const request = getSharedRequestProps(baseRequest)
    expect(request.method).toBe("GET")
  })

  test("`headers` getter", () => {
    const request = getSharedRequestProps(baseRequest)
    expect(request.headers).toEqual(baseRequest.headers)
  })

  test("`params` getter", () => {
    const request = getSharedRequestProps(baseRequest)
    expect(request.params).toEqual(baseRequest.params)
  })

  test("`body` getter", () => {
    const request = getSharedRequestProps(baseRequest)
    expect(request.body).toEqual(baseRequest.body)
  })

  test("`auth` getter", () => {
    const request = getSharedRequestProps(baseRequest)
    expect(request.auth).toEqual(baseRequest.auth)
  })

  test("`params` getter", () => {
    const request = getSharedRequestProps(baseRequest)
    expect(request.params).toEqual(baseRequest.params)
  })

  test("`body` getter", () => {
    const request = getSharedRequestProps(baseRequest)
    expect(request.body).toEqual(baseRequest.body)
  })

  test("`auth` getter", () => {
    const request = getSharedRequestProps(baseRequest)
    expect(request.auth).toEqual(baseRequest.auth)
  })
})

describe("getSharedCookieMethods", () => {
  const validCookie: Cookie = {
    name: "session",
    value: "abc123",
    domain: "example.com",
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
  }

  test("get() should return existing cookie or null", () => {
    const { methods } = getSharedCookieMethods([
      validCookie,
      { ...validCookie, name: "token", value: "xyz" },
    ])

    expect(methods.get("example.com", "session")).toEqual(validCookie)
    expect(methods.get("example.com", "missing")).toBeNull()
  })

  test("get() should throw for non-string args", () => {
    const { methods } = getSharedCookieMethods([validCookie])
    expect(() => methods.get(123, "session")).toThrow(
      "Expected domain and cookieName to be strings"
    )
  })

  test("set() should add a new cookie", () => {
    const { methods } = getSharedCookieMethods([])
    methods.set("example.com", validCookie)

    expect(methods.get("example.com", "session")).toEqual(validCookie)
  })

  test("set() should replace an existing cookie with same domain+name", () => {
    const oldCookie = { ...validCookie, value: "old" }
    const { methods } = getSharedCookieMethods([oldCookie])

    methods.set("example.com", validCookie)

    expect(methods.getAll("example.com")).toHaveLength(1)
    expect(methods.get("example.com", "session")?.value).toBe("abc123")
  })

  test("set() should throw for invalid cookie per schema", () => {
    const { methods } = getSharedCookieMethods([])
    expect(() => methods.set("example.com", { bad: "cookie" })).toThrow(
      "Invalid cookie"
    )
  })

  test("has() should return true if cookie exists", () => {
    const { methods } = getSharedCookieMethods([validCookie])

    expect(methods.has("example.com", "session")).toBe(true)
    expect(methods.has("example.com", "missing")).toBe(false)
  })

  test("getAll() should return all cookies for a domain", () => {
    const cookies = [
      validCookie,
      { ...validCookie, name: "token", value: "x" },
      { ...validCookie, domain: "other.com" },
    ]
    const { methods } = getSharedCookieMethods(cookies)

    const result = methods.getAll("example.com")
    expect(result).toHaveLength(2)
    expect(result.every((c) => c.domain === "example.com")).toBe(true)
  })

  test("delete() should remove the specified cookie", () => {
    const { methods } = getSharedCookieMethods([validCookie])
    methods.delete("example.com", "session")
    expect(methods.get("example.com", "session")).toBeNull()
  })

  test("clear() should remove all cookies for a domain", () => {
    const cookies = [validCookie, { ...validCookie, name: "token", value: "x" }]
    const { methods } = getSharedCookieMethods(cookies)

    methods.clear("example.com")
    expect(methods.getAll("example.com")).toHaveLength(0)
  })

  test("should throw for non-string args on has/delete/getAll/clear", () => {
    const { methods } = getSharedCookieMethods([validCookie])
    expect(() => methods.has(123 as any, "session")).toThrow()
    expect(() => methods.delete(123 as any, "session")).toThrow()
    expect(() => methods.getAll(123 as any)).toThrow()
    expect(() => methods.clear(123 as any)).toThrow()
  })
})
