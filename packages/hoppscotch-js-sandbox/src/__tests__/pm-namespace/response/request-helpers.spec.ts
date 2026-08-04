/**
 * @file Request Helpers — Headers, Body & URL utilities (PM310–PM312)
 *
 * Tests for newly implemented request-side helper methods (pre-request + test scripts):
 *   - pm.request.headers.one(key)       → alias for get(key)  (PM310)
 *   - pm.request.body.isEmpty()         → true when body is null/empty  (PM311)
 *   - pm.request.url.getOAuth1BaseUrl() → URL without query string  (PM312)
 */

import { describe, expect, test } from "vitest"
import { runTest, runPreRequest } from "~/utils/test-helpers"
import type { HoppRESTRequest } from "@hoppscotch/data"

type TestResponse = { status: number; statusText: string; body: string; headers: { key: string; value: string }[] }

const mockResponse: TestResponse = { status: 200, statusText: "OK", body: "{}", headers: [] }

const mockRequest = (overrides: Partial<HoppRESTRequest> = {}): HoppRESTRequest => ({
  v: "2",
  id: "test-req",
  name: "Test Request",
  method: "POST",
  endpoint: "https://api.example.com/users?role=admin",
  params: [],
  headers: [
    { key: "Content-Type", value: "application/json", active: true, description: "" },
    { key: "Authorization", value: "Bearer token123", active: true, description: "" },
  ],
  preRequestScript: "",
  testScript: "",
  auth: { authType: "none", authActive: false },
  body: { contentType: "application/json", body: '{"name":"alice"}' },
  requestVariables: [],
  ...overrides,
} as unknown as HoppRESTRequest)

// ─── D1: pm.request.headers.one(key) (PM310) ───────────────────────────────
describe("pm.request.headers.one(key) — PM310", () => {
  test("returns a Header object { key, value } for existing header in test script", () => {
    return expect(
      runTest(`
        pm.test("headers one — object shape", () => {
          const val = pm.request.headers.one("Authorization")
          // one() must return a Header object, not a plain string
          pm.expect(val).to.be.an("object")
          pm.expect(val.key).to.equal("Authorization")
          pm.expect(val.value).to.equal("Bearer token123")
        })
      `, { global: [], selected: [] }, mockResponse, mockRequest())()
    ).resolves.toEqualRight([expect.objectContaining({
      children: [expect.objectContaining({ expectResults: [
        { status: "pass", message: expect.any(String) },
        { status: "pass", message: expect.any(String) },
        { status: "pass", message: expect.any(String) },
      ] })],
    })])
  })

  test("value property of returned object equals the header value", () => {
    return expect(
      runTest(`
        pm.test("headers one — .value accessor", () => {
          const val = pm.request.headers.one("Content-Type")
          pm.expect(val.value).to.equal("application/json")
        })
      `, { global: [], selected: [] }, mockResponse, mockRequest())()
    ).resolves.toEqualRight([expect.objectContaining({
      children: [expect.objectContaining({ expectResults: [{ status: "pass", message: expect.any(String) }] })],
    })])
  })

  test("returns null for missing header in test script", () => {
    return expect(
      runTest(`
        pm.test("headers one missing", () => {
          const val = pm.request.headers.one("X-Not-Here")
          pm.expect(val).to.be.null
        })
      `, { global: [], selected: [] }, mockResponse, mockRequest())()
    ).resolves.toEqualRight([expect.objectContaining({
      children: [expect.objectContaining({ expectResults: [{ status: "pass", message: expect.any(String) }] })],
    })])
  })

  test("returns a Header object { key, value } for existing header in pre-request script", () => {
    return expect(
      runPreRequest(`
        const val = pm.request.headers.one("Content-Type")
        // val is { key, value } — store the .value string for assertion
        pm.environment.set("ct", val ? val.value : "missing")
      `, { global: [], selected: [] }, mockRequest())()
    ).resolves.toEqualRight(expect.objectContaining({
      selected: [expect.objectContaining({ key: "ct", currentValue: "application/json" })],
    }))
  })

  test("returned object has both key and value properties in pre-request script", () => {
    return expect(
      runPreRequest(`
        const val = pm.request.headers.one("Authorization")
        pm.environment.set("hKey", val ? val.key : "missing")
        pm.environment.set("hVal", val ? val.value : "missing")
      `, { global: [], selected: [] }, mockRequest())()
    ).resolves.toEqualRight(expect.objectContaining({
      selected: expect.arrayContaining([
        expect.objectContaining({ key: "hKey", currentValue: "Authorization" }),
        expect.objectContaining({ key: "hVal", currentValue: "Bearer token123" }),
      ]),
    }))
  })
})

// ─── D2: pm.request.body.isEmpty() (PM311) ─────────────────────────────────
describe("pm.request.body.isEmpty() — PM311", () => {
  test("returns false for a request with a JSON body in test script", () => {
    return expect(
      runTest(`
        pm.test("body not empty", () => {
          pm.expect(pm.request.body.isEmpty()).to.be.false
        })
      `, { global: [], selected: [] }, mockResponse, mockRequest())()
    ).resolves.toEqualRight([expect.objectContaining({
      children: [expect.objectContaining({ expectResults: [{ status: "pass", message: expect.any(String) }] })],
    })])
  })

  test("returns false for a request with body in pre-request script", () => {
    return expect(
      runPreRequest(`
        const empty = pm.request.body.isEmpty()
        pm.environment.set("isEmpty", String(empty))
      `, { global: [], selected: [] }, mockRequest())()
    ).resolves.toEqualRight(expect.objectContaining({
      selected: [expect.objectContaining({ key: "isEmpty", currentValue: "false" })],
    }))
  })
})

// ─── D3: pm.request.url.getOAuth1BaseUrl() (PM312) ─────────────────────────
describe("pm.request.url.getOAuth1BaseUrl() — PM312", () => {
  test("returns URL without query string in test script", () => {
    return expect(
      runTest(`
        pm.test("oauth1 base url", () => {
          const base = pm.request.url.getOAuth1BaseUrl()
          pm.expect(base).to.equal("https://api.example.com/users")
          pm.expect(base).to.not.include("?")
        })
      `, { global: [], selected: [] }, mockResponse, mockRequest())()
    ).resolves.toEqualRight([expect.objectContaining({
      children: [expect.objectContaining({ expectResults: [
        { status: "pass", message: expect.any(String) },
        { status: "pass", message: expect.any(String) },
      ] })],
    })])
  })

  test("returns URL without query string in pre-request script", () => {
    return expect(
      runPreRequest(`
        const base = pm.request.url.getOAuth1BaseUrl()
        pm.environment.set("baseUrl", base)
      `, { global: [], selected: [] }, mockRequest())()
    ).resolves.toEqualRight(expect.objectContaining({
      selected: [expect.objectContaining({ key: "baseUrl", currentValue: "https://api.example.com/users" })],
    }))
  })
})

