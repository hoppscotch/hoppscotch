import { getSharedRequestProps, preventCyclicObjects } from "~/utils/shared"

import { HoppRESTRequest } from "@hoppscotch/data"
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
