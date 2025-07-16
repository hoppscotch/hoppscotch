import {
  HoppRESTAuth,
  HoppRESTReqBody,
  HoppRESTRequest,
} from "@hoppscotch/data"
import { describe, expect, test } from "vitest"

import { getRequestSetterMethods } from "~/utils/pre-request"

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

describe("getRequestSetterMethods", () => {
  test("`setUrl` method", () => {
    const { methods, updatedRequest } = getRequestSetterMethods(baseRequest)
    methods.setUrl("https://updated.com/api")

    expect(updatedRequest.endpoint).toBe("https://updated.com/api")
  })

  test("`setMethod` should update and uppercase the method", () => {
    const { methods, updatedRequest } = getRequestSetterMethods(baseRequest)
    methods.setMethod("post")

    expect(updatedRequest.method).toBe("POST")
  })

  test("`setHeader` setter should update existing header case-insensitively", () => {
    const { methods, updatedRequest } = getRequestSetterMethods(baseRequest)
    methods.setHeader("x-test", "updatedVal")

    expect(
      updatedRequest.headers.find((h) => h.key.toLowerCase() === "x-test")
        ?.value,
    ).toBe("updatedVal")
  })

  test("`setHeader` setter should add new header if not present", () => {
    const { methods, updatedRequest } = getRequestSetterMethods(baseRequest)
    methods.setHeader("X-New-Header", "newValue")

    expect(updatedRequest.headers.some((h) => h.key === "X-New-Header")).toBe(
      true,
    )
    expect(
      updatedRequest.headers.find((h) => h.key === "X-New-Header")?.value,
    ).toBe("newValue")
  })

  test("`removeHeader` setter should remove a header", () => {
    const { methods, updatedRequest } = getRequestSetterMethods(baseRequest)
    methods.removeHeader("X-Test")

    expect(
      updatedRequest.headers.find((h) => h.key === "X-Test"),
    ).toBeUndefined()
  })

  test("`setParam` setter should update existing param case-insensitively", () => {
    const { methods, updatedRequest } = getRequestSetterMethods(baseRequest)
    methods.setParam("Q", "updatedParam")

    expect(
      updatedRequest.params.find((p) => p.key.toLowerCase() === "q")?.value,
    ).toBe("updatedParam")
  })

  test("`setParam` setter should add new param if absent", () => {
    const { methods, updatedRequest } = getRequestSetterMethods(baseRequest)
    methods.setParam("newParam", "value")

    expect(updatedRequest.params.some((p) => p.key === "newParam")).toBe(true)
  })

  test("`removeParam` setter should remove a param", () => {
    const { methods, updatedRequest } = getRequestSetterMethods(baseRequest)
    methods.removeParam("q")

    expect(updatedRequest.params.find((p) => p.key === "q")).toBeUndefined()
  })

  test("`setBody` setter should update the body", () => {
    const { methods, updatedRequest } = getRequestSetterMethods(baseRequest)
    const newBody: HoppRESTReqBody = {
      contentType: "application/json",
      body: JSON.stringify({ changed: true }),
    }

    methods.setBody(newBody)
    expect(updatedRequest.body).toEqual(newBody)
  })

  test("`setAuth` setter should update the authorization properties", () => {
    const { methods, updatedRequest } = getRequestSetterMethods(baseRequest)
    const newAuth: HoppRESTAuth = {
      authType: "basic",
      username: "abc",
      password: "123",
      authActive: true,
    }

    methods.setAuth(newAuth)
    expect(updatedRequest.auth).toEqual(newAuth)
  })

  test("`setHeaders` setter throws error on invalid input", () => {
    const { methods } = getRequestSetterMethods(baseRequest)
    expect(() => methods.setHeaders(null)).toThrow()
  })

  test("`setParams` setter throws error on invalid input", () => {
    const { methods } = getRequestSetterMethods(baseRequest)
    expect(() => methods.setParams(null)).toThrow()
  })

  test("`setBody` setter throws error on invalid input", () => {
    const { methods } = getRequestSetterMethods(baseRequest)
    expect(() => methods.setBody("invalid_body")).toThrow()
  })

  test("`setAuth` setter throws error on invalid input", () => {
    const { methods } = getRequestSetterMethods(baseRequest)
    expect(() => methods.setAuth({})).toThrow()
  })
})
