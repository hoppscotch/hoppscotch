import {
  HoppRESTAuth,
  HoppRESTReqBody,
  HoppRESTRequest,
} from "@hoppscotch/data"
import { describe, expect, test } from "vitest"

import { runPreRequestScript } from "~/web"

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
  requestVariables: [{ key: "req-var-1", value: "value-1", active: true }],
  responses: {},
}

describe("hopp.request", () => {
  test("hopp.request.url should return the url", () => {
    expect(
      runPreRequestScript(`console.log(hopp.request.url)`, {
        envs: { global: [], selected: [] },
        request: baseRequest,
      }),
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: [
          expect.objectContaining({ args: ["https://example.com/api"] }),
        ],
      }),
    )
  })

  test("hopp.request.url prevents writes", () => {
    expect(
      runPreRequestScript(`hopp.request.url = 'https://echo.hoppscotch.io'`, {
        envs: { global: [], selected: [] },
        request: baseRequest,
      }),
    ).resolves.toEqualLeft(
      "Script execution failed: hopp.request.url is read-only",
    )
  })

  test("hopp.request.method should return the method", () => {
    expect(
      runPreRequestScript(`console.log(hopp.request.method)`, {
        envs: { global: [], selected: [] },
        request: baseRequest,
      }),
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: [expect.objectContaining({ args: ["GET"] })],
      }),
    )
  })

  test("hopp.request.method prevents writes", () => {
    expect(
      runPreRequestScript(`hopp.request.method = 'POST'`, {
        envs: { global: [], selected: [] },
        request: baseRequest,
      }),
    ).resolves.toEqualLeft(
      "Script execution failed: hopp.request.method is read-only",
    )
  })

  test("hopp.request.headers should return headers", () => {
    expect(
      runPreRequestScript(`console.log(hopp.request.headers)`, {
        envs: { global: [], selected: [] },
        request: baseRequest,
      }),
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: [
          expect.objectContaining({ args: [baseRequest.headers] }),
        ],
      }),
    )
  })

  test("hopp.request.headers prevents writes", () => {
    expect(
      runPreRequestScript(`hopp.request.headers = []`, {
        envs: { global: [], selected: [] },
        request: baseRequest,
      }),
    ).resolves.toEqualLeft(
      "Script execution failed: hopp.request.headers is read-only",
    )
  })

  test("hopp.request.params should return params", () => {
    expect(
      runPreRequestScript(`console.log(hopp.request.params)`, {
        envs: { global: [], selected: [] },
        request: baseRequest,
      }),
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: [
          expect.objectContaining({ args: [baseRequest.params] }),
        ],
      }),
    )
  })

  test("hopp.request.params prevents writes", () => {
    expect(
      runPreRequestScript(`hopp.request.params = []`, {
        envs: { global: [], selected: [] },
        request: baseRequest,
      }),
    ).resolves.toEqualLeft(
      "Script execution failed: hopp.request.params is read-only",
    )
  })

  test("hopp.request.body should return body", () => {
    expect(
      runPreRequestScript(`console.log(hopp.request.body)`, {
        envs: { global: [], selected: [] },
        request: baseRequest,
      }),
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: [expect.objectContaining({ args: [baseRequest.body] })],
      }),
    )
  })

  test("hopp.request.body prevents writes", () => {
    expect(
      runPreRequestScript(`hopp.request.body = {}`, {
        envs: { global: [], selected: [] },
        request: baseRequest,
      }),
    ).resolves.toEqualLeft(
      "Script execution failed: hopp.request.body is read-only",
    )
  })

  test("hopp.request.auth should return auth", () => {
    expect(
      runPreRequestScript(`console.log(hopp.request.auth)`, {
        envs: { global: [], selected: [] },
        request: baseRequest,
      }),
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: [expect.objectContaining({ args: [baseRequest.auth] })],
      }),
    )
  })

  test("hopp.request.auth prevents writes", () => {
    expect(
      runPreRequestScript(`hopp.request.auth = {}`, {
        envs: { global: [], selected: [] },
        request: baseRequest,
      }),
    ).resolves.toEqualLeft(
      "Script execution failed: hopp.request.auth is read-only",
    )
  })

  test("hopp.request.setUrl should update the URL", () => {
    expect(
      runPreRequestScript(`hopp.request.setUrl("https://updated.com/api")`, {
        envs: { global: [], selected: [] },
        request: baseRequest,
      }),
    ).resolves.toEqualRight(
      expect.objectContaining({
        updatedRequest: expect.objectContaining({
          endpoint: "https://updated.com/api",
        }),
      }),
    )
  })

  test("hopp.request.setMethod should update and uppercase the method", () => {
    expect(
      runPreRequestScript(`hopp.request.setMethod("post")`, {
        envs: { global: [], selected: [] },
        request: baseRequest,
      }),
    ).resolves.toEqualRight(
      expect.objectContaining({
        updatedRequest: expect.objectContaining({
          method: "POST",
        }),
      }),
    )
  })

  test("hopp.request.setHeader should update existing header case-insensitively", () => {
    expect(
      runPreRequestScript(`hopp.request.setHeader("x-test", "updatedVal")`, {
        envs: { global: [], selected: [] },
        request: baseRequest,
      }),
    ).resolves.toEqualRight(
      expect.objectContaining({
        updatedRequest: expect.objectContaining({
          headers: [
            expect.objectContaining({
              key: "X-Test",
              value: "updatedVal",
            }),
          ],
        }),
      }),
    )
  })

  test("hopp.request.setHeader should add new header if not present", () => {
    expect(
      runPreRequestScript(
        `hopp.request.setHeader("X-New-Header", "newValue")`,
        {
          envs: { global: [], selected: [] },
          request: baseRequest,
        },
      ),
    ).resolves.toEqualRight(
      expect.objectContaining({
        updatedRequest: expect.objectContaining({
          headers: expect.arrayContaining([
            expect.objectContaining({ key: "X-New-Header", value: "newValue" }),
          ]),
        }),
      }),
    )
  })

  test("hopp.request.removeHeader should remove a header", () => {
    expect(
      runPreRequestScript(`hopp.request.removeHeader("X-Test")`, {
        envs: { global: [], selected: [] },
        request: baseRequest,
      }),
    ).resolves.toEqualRight(
      expect.objectContaining({
        updatedRequest: expect.objectContaining({
          headers: [],
        }),
      }),
    )
  })

  test("hopp.request.setParam should update existing param case-insensitively", () => {
    expect(
      runPreRequestScript(`hopp.request.setParam("Q", "updatedParam")`, {
        envs: { global: [], selected: [] },
        request: baseRequest,
      }),
    ).resolves.toEqualRight(
      expect.objectContaining({
        updatedRequest: expect.objectContaining({
          params: [
            expect.objectContaining({ key: "q", value: "updatedParam" }),
          ],
        }),
      }),
    )
  })

  test("hopp.request.setParam should add new param if absent", () => {
    expect(
      runPreRequestScript(`hopp.request.setParam("newParam", "value")`, {
        envs: { global: [], selected: [] },
        request: baseRequest,
      }),
    ).resolves.toEqualRight(
      expect.objectContaining({
        updatedRequest: expect.objectContaining({
          params: expect.arrayContaining([
            expect.objectContaining({ key: "newParam", value: "value" }),
          ]),
        }),
      }),
    )
  })

  test("hopp.request.removeParam should remove a param", () => {
    expect(
      runPreRequestScript(`hopp.request.removeParam("q")`, {
        envs: { global: [], selected: [] },
        request: baseRequest,
      }),
    ).resolves.toEqualRight(
      expect.objectContaining({
        updatedRequest: expect.objectContaining({
          params: [],
        }),
      }),
    )
  })

  test("hopp.request.setBody should update the body", () => {
    const newBody: HoppRESTReqBody = {
      contentType: "application/json",
      body: JSON.stringify({ changed: true }),
    }
    expect(
      runPreRequestScript(`hopp.request.setBody(${JSON.stringify(newBody)})`, {
        envs: { global: [], selected: [] },
        request: baseRequest,
      }),
    ).resolves.toEqualRight(
      expect.objectContaining({
        updatedRequest: expect.objectContaining({
          body: newBody,
        }),
      }),
    )
  })

  test("hopp.request.setAuth should update the auth", () => {
    const newAuth: HoppRESTAuth = {
      authType: "basic",
      username: "abc",
      password: "123",
      authActive: true,
    }

    expect(
      runPreRequestScript(`hopp.request.setAuth(${JSON.stringify(newAuth)})`, {
        envs: { global: [], selected: [] },
        request: baseRequest,
      }),
    ).resolves.toEqualRight(
      expect.objectContaining({
        updatedRequest: expect.objectContaining({
          auth: newAuth,
        }),
      }),
    )
  })

  test("hopp.request.setHeaders throws error on invalid input", () => {
    expect(
      runPreRequestScript(`hopp.request.setHeaders(null)`, {
        envs: { global: [], selected: [] },
        request: baseRequest,
      }),
    ).resolves.toBeLeft()
  })

  test("hopp.request.setParams throws error on invalid input", () => {
    expect(
      runPreRequestScript(`hopp.request.setParams(null)`, {
        envs: { global: [], selected: [] },
        request: baseRequest,
      }),
    ).resolves.toBeLeft()
  })

  test("hopp.request.setBody throws error on invalid input", () => {
    expect(
      runPreRequestScript(`hopp.request.setBody("invalid_body")`, {
        envs: { global: [], selected: [] },
        request: baseRequest,
      }),
    ).resolves.toBeLeft()
  })

  test("hopp.request.setAuth throws error on invalid input", () => {
    expect(
      runPreRequestScript(`hopp.request.setAuth({})`, {
        envs: { global: [], selected: [] },
        request: baseRequest,
      }),
    ).resolves.toBeLeft()
  })

  test("hopp.request.variables.get should return the request variable", () => {
    expect(
      runPreRequestScript(
        `console.log(hopp.request.variables.get("req-var-1"))`,
        {
          envs: { global: [], selected: [] },
          request: baseRequest,
        },
      ),
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: [expect.objectContaining({ args: ["value-1"] })],
      }),
    )
  })

  test("hopp.request.variables.set should update the request variable", () => {
    expect(
      runPreRequestScript(
        `hopp.request.variables.set("req-var-1", "new-value-1")`,
        {
          envs: { global: [], selected: [] },
          request: baseRequest,
        },
      ),
    ).resolves.toEqualRight(
      expect.objectContaining({
        updatedRequest: expect.objectContaining({
          requestVariables: [
            {
              key: "req-var-1",
              value: "new-value-1",
              active: true,
            },
          ],
        }),
      }),
    )
  })

  test("hopp.request.variables.set should add a new request variable if the supplied key does not exist", () => {
    expect(
      runPreRequestScript(
        `hopp.request.variables.set("req-var-2", "value-2")`,
        {
          envs: { global: [], selected: [] },
          request: baseRequest,
        },
      ),
    ).resolves.toEqualRight(
      expect.objectContaining({
        updatedRequest: expect.objectContaining({
          requestVariables: [
            {
              key: "req-var-1",
              value: "value-1",
              active: true,
            },
            {
              key: "req-var-2",
              value: "value-2",
              active: true,
            },
          ],
        }),
      }),
    )
  })

  // TODO: Enable once proper freezing is in place
  test.skip("hopp.request.variables prevents writes", () => {
    expect(
      runPreRequestScript(`hopp.request.variables = {}`, {
        envs: { global: [], selected: [] },
        request: baseRequest,
      }),
    ).resolves.toEqualLeft(
      "Script execution failed: hopp.request.variables is read-only",
    )
  })
})
