import {
  getSharedCookieMethods,
  getSharedEnvMethods,
  getSharedRequestProps,
  preventCyclicObjects,
} from "~/utils/shared"

import { Cookie, HoppRESTRequest } from "@hoppscotch/data"
import { describe, expect, test } from "vitest"
import { TestResult } from "~/types"

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
    v: "16",
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

describe("getSharedEnvMethods - Experimental Sandbox (isHoppNamespace=true)", () => {
  const baseEnvs: TestResult["envs"] = {
    global: [
      {
        key: "globalKey",
        currentValue: "globalVal",
        initialValue: "globalVal",
        secret: false,
      },
    ],
    selected: [
      {
        key: "selectedKey",
        currentValue: "selectedVal",
        initialValue: "selectedVal",
        secret: false,
      },
    ],
  }

  test("returns pw and hopp namespace structure", () => {
    const { methods } = getSharedEnvMethods(baseEnvs, true)

    expect(methods).toHaveProperty("pw")
    expect(methods).toHaveProperty("hopp")
    expect(methods.pw).toHaveProperty("get")
    expect(methods.hopp).toHaveProperty("set")
  })

  test("pw.get retrieves from selected then global", () => {
    const { methods } = getSharedEnvMethods(baseEnvs, true)

    expect(methods.pw.get("selectedKey")).toBe("selectedVal")
    expect(methods.pw.get("globalKey")).toBe("globalVal")
    expect(methods.pw.get("nonexistent")).toBeUndefined()
  })

  test("pw.set updates selected environment", () => {
    const { methods, updatedEnvs } = getSharedEnvMethods(baseEnvs, true)

    methods.pw.set("newKey", "newVal")

    expect(updatedEnvs.selected).toContainEqual({
      key: "newKey",
      currentValue: "newVal",
      initialValue: "newVal",
      secret: false,
    })
  })

  test("pw.set validates string key and value", () => {
    const { methods } = getSharedEnvMethods(baseEnvs, true)

    expect(() => methods.pw.set(123 as any, "value")).toThrow(
      "Expected key to be a string"
    )
    expect(() => methods.pw.set("key", 123 as any)).toThrow(
      "Expected value to be a string"
    )
  })

  test("pw.resolve handles template strings", () => {
    const { methods } = getSharedEnvMethods(
      {
        global: [],
        selected: [
          {
            key: "name",
            currentValue: "Alice",
            initialValue: "Alice",
            secret: false,
          },
          {
            key: "greeting",
            currentValue: "Hello <<name>>",
            initialValue: "Hello <<name>>",
            secret: false,
          },
        ],
      },
      true
    )

    const resolved = methods.pw.resolve("<<greeting>>")
    expect(resolved).toBe("Hello Alice")
  })

  test("pw.getResolve combines get and resolve", () => {
    const { methods } = getSharedEnvMethods(
      {
        global: [],
        selected: [
          {
            key: "baseUrl",
            currentValue: "https://api.example.com",
            initialValue: "https://api.example.com",
            secret: false,
          },
          {
            key: "endpoint",
            currentValue: "<<baseUrl>>/users",
            initialValue: "<<baseUrl>>/users",
            secret: false,
          },
        ],
      },
      true
    )

    const resolved = methods.pw.getResolve("endpoint")
    expect(resolved).toBe("https://api.example.com/users")
  })

  test("hopp.set creates new variable in selected scope (default source='all')", () => {
    const { methods, updatedEnvs } = getSharedEnvMethods(baseEnvs, true)

    methods.hopp.set("hoppKey", "hoppVal")

    expect(updatedEnvs.selected).toContainEqual({
      key: "hoppKey",
      currentValue: "hoppVal",
      initialValue: "hoppVal",
      secret: false,
    })
  })

  test("hopp.set validates string types", () => {
    const { methods } = getSharedEnvMethods(baseEnvs, true)

    expect(() => methods.hopp.set(123 as any, "value")).toThrow(
      "Expected key to be a string"
    )
    expect(() => methods.hopp.set("key", 123 as any)).toThrow(
      "Expected value to be a string"
    )
  })

  test("hopp.delete removes variable from selected scope", () => {
    const { methods, updatedEnvs } = getSharedEnvMethods(baseEnvs, true)

    methods.hopp.delete("selectedKey")

    expect(updatedEnvs.selected).not.toContainEqual(
      expect.objectContaining({ key: "selectedKey" })
    )
    expect(updatedEnvs.global.length).toBe(1)
  })

  test("hopp.reset resets a variable to its initial value", () => {
    const { methods, updatedEnvs } = getSharedEnvMethods(
      {
        global: [],
        selected: [
          {
            key: "testKey",
            currentValue: "modified",
            initialValue: "original",
            secret: false,
          },
        ],
      },
      true
    )

    methods.hopp.reset("testKey")

    const variable = updatedEnvs.selected.find((e) => e.key === "testKey")
    expect(variable?.currentValue).toBe("original")
    expect(variable?.initialValue).toBe("original")
  })

  test("hopp.getInitialRaw returns initial value", () => {
    const { methods } = getSharedEnvMethods(
      {
        global: [],
        selected: [
          {
            key: "testKey",
            currentValue: "currentVal",
            initialValue: "initialVal",
            secret: false,
          },
        ],
      },
      true
    )

    expect(methods.hopp.getInitialRaw("testKey")).toBe("initialVal")
    expect(methods.hopp.getInitialRaw("nonexistent")).toBeNull()
  })

  test("hopp.setInitial sets initial value", () => {
    const { methods, updatedEnvs } = getSharedEnvMethods(baseEnvs, true)

    methods.hopp.setInitial("initKey", "initVal")

    const created = updatedEnvs.selected.find((e) => e.key === "initKey")
    expect(created).toBeDefined()
    expect(created?.initialValue).toBe("initVal")
    expect(created?.currentValue).toBe("initVal")
  })
})

describe("getSharedEnvMethods - Legacy Sandbox (isHoppNamespace=false)", () => {
  const baseEnvs: TestResult["envs"] = {
    global: [
      {
        key: "globalKey",
        currentValue: "globalVal",
        initialValue: "globalVal",
        secret: false,
      },
    ],
    selected: [
      {
        key: "selectedKey",
        currentValue: "selectedVal",
        initialValue: "selectedVal",
        secret: false,
      },
    ],
  }

  test("returns env object structure (not pw/hopp)", () => {
    const { methods } = getSharedEnvMethods(baseEnvs, false)

    expect(methods).toHaveProperty("env")
    expect(methods).not.toHaveProperty("pw")
    expect(methods).not.toHaveProperty("hopp")
  })

  test("env object has all expected methods", () => {
    const { methods } = getSharedEnvMethods(baseEnvs, false)

    expect(typeof methods.env.get).toBe("function")
    expect(typeof methods.env.set).toBe("function")
    expect(typeof methods.env.resolve).toBe("function")
    expect(typeof methods.env.getResolve).toBe("function")
  })

  test("env.get retrieves from selected then global", () => {
    const { methods } = getSharedEnvMethods(baseEnvs, false)

    expect(methods.env.get("selectedKey")).toBe("selectedVal")
    expect(methods.env.get("globalKey")).toBe("globalVal")
    expect(methods.env.get("nonexistent")).toBeUndefined()
  })

  test("env.set updates environment correctly", () => {
    const { methods, updatedEnvs } = getSharedEnvMethods(baseEnvs, false)

    methods.env.set("newKey", "newVal")

    expect(updatedEnvs.selected).toContainEqual({
      key: "newKey",
      currentValue: "newVal",
      initialValue: "newVal",
      secret: false,
    })
  })

  test("env.set validates string types (regression test for #5433)", () => {
    const { methods } = getSharedEnvMethods(baseEnvs, false)

    // This is the bug that was fixed in #5433 - missing validation
    expect(() => methods.env.set(123 as any, "value")).toThrow(
      "Expected key to be a string"
    )
    expect(() => methods.env.set("key", 123 as any)).toThrow(
      "Expected value to be a string"
    )
  })

  test("env.resolve handles template strings", () => {
    const { methods } = getSharedEnvMethods(
      {
        global: [],
        selected: [
          {
            key: "user",
            currentValue: "Bob",
            initialValue: "Bob",
            secret: false,
          },
          {
            key: "message",
            currentValue: "Hello <<user>>",
            initialValue: "Hello <<user>>",
            secret: false,
          },
        ],
      },
      false
    )

    const resolved = methods.env.resolve("<<message>>")
    expect(resolved).toBe("Hello Bob")
  })

  test("env.getResolve returns resolved value", () => {
    const { methods } = getSharedEnvMethods(
      {
        global: [],
        selected: [
          {
            key: "domain",
            currentValue: "example.com",
            initialValue: "example.com",
            secret: false,
          },
          {
            key: "apiUrl",
            currentValue: "https://<<domain>>/api",
            initialValue: "https://<<domain>>/api",
            secret: false,
          },
        ],
      },
      false
    )

    const resolved = methods.env.getResolve("apiUrl")
    expect(resolved).toBe("https://example.com/api")
  })

  test("env object structure prevents #5433 regression (pw.env not recognized)", () => {
    const { methods } = getSharedEnvMethods(baseEnvs, false)

    // In legacy sandbox, this gets assigned to pw.env
    // The bug was that pw.env was undefined because the structure wasn't correct
    expect(methods.env).toBeDefined()
    expect(typeof methods.env).toBe("object")
    expect(methods.env.get).toBeDefined()
    expect(methods.env.set).toBeDefined()
  })
})
